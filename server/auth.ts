import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  const hashedPassword = `${buf.toString("hex")}.${salt}`;
  console.log('Generated password hash:', hashedPassword);
  return hashedPassword;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.error('Invalid stored password format');
      return false;
    }
    console.log('Comparing password with salt:', salt);
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

async function generateVerificationToken() {
  return randomBytes(32).toString("hex");
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET ?? 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          const normalizedEmail = normalizeEmail(email);
          console.log('Login attempt for email:', normalizedEmail);

          const user = await storage.getUserByEmail(normalizedEmail);
          console.log('Found user:', user ? 'yes' : 'no');

          if (!user) {
            return done(null, false, { message: "Invalid credentials" });
          }

          console.log('Stored password hash:', user.password);
          const isPasswordValid = await comparePasswords(password, user.password);
          console.log('Password validation result:', isPasswordValid);

          if (!isPasswordValid) {
            return done(null, false, { message: "Invalid credentials" });
          }

          if (!user.isVerified) {
            return done(null, false, { message: "Please verify your email first" });
          }

          return done(null, user);
        } catch (error) {
          console.error('Login error:', error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('Deserializing user:', id);
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const { email: rawEmail, password } = req.body;
      const email = normalizeEmail(rawEmail);

      if (!email || !password) {
        return res.status(400).json({
          message: "Email and password are required",
          status: "error"
        });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          message: "Email already registered",
          status: "error"
        });
      }

      const verificationToken = await generateVerificationToken();
      const hashedPassword = await hashPassword(password);

      console.log('Creating user with hashed password:', hashedPassword);

      const user = await storage.createUser({
        email,
        password: hashedPassword,
        verificationToken,
      });

      console.log('User created successfully:', {
        id: user.id,
        email: user.email,
        verificationToken: user.verificationToken
      });

      res.status(201).json({
        message: "Registration successful",
        status: "success",
        verificationToken // Include token in response for testing
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        message: "Failed to create account. Please try again.",
        status: "error"
      });
    }
  });

  app.post("/api/login", (req, res, next) => {
    const rawEmail = req.body.email;
    const normalizedEmail = normalizeEmail(rawEmail);
    console.log('Login attempt:', normalizedEmail);

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error('Authentication error:', err);
        return res.status(500).json({ message: "Authentication failed" });
      }
      if (!user) {
        console.log('Authentication failed:', info.message);
        return res.status(401).json({ message: info.message || "Invalid credentials" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ message: "Login failed" });
        }
        console.log('Login successful for user:', user.email);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    console.log('Logout attempt for user:', req.user?.email);
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/verify-email", async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: "Invalid verification token" });
    }

    const user = await storage.getUserByVerificationToken(token);
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    await storage.verifyUser(user.id);
    res.json({ message: "Email verified successfully. You can now log in." });
  });

  app.get("/api/user", (req, res) => {
    console.log('Get user request, authenticated:', req.isAuthenticated(), 'user:', req.user?.email);
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });
}