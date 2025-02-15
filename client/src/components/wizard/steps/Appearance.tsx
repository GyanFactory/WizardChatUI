import { useWizardStore, defaultAvatars } from "@/store/wizardStore";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Appearance() {
  const {
    primaryColor,
    fontFamily,
    position,
    avatarUrl,
    bubbleStyle,
    backgroundColor,
    buttonStyle,
    welcomeMessage,
    updateConfig,
  } = useWizardStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Customize Appearance</h2>
        <p className="text-gray-600 mb-6">
          Customize how your chatbot looks and feels.
        </p>
      </div>

      <Card className="p-6 space-y-8">
        <div className="space-y-2">
          <Label htmlFor="welcomeMessage">Welcome Message</Label>
          <Textarea
            id="welcomeMessage"
            value={welcomeMessage}
            onChange={(e) => updateConfig({ welcomeMessage: e.target.value })}
            placeholder="Hello! How can I help you today?"
            rows={3}
          />
        </div>

        <div className="space-y-4">
          <Label>Avatar</Label>
          <div className="grid grid-cols-5 gap-4">
            {defaultAvatars.map((avatar) => (
              <button
                key={avatar}
                onClick={() => updateConfig({ avatarUrl: avatar })}
                className={`relative aspect-square rounded-lg border-2 overflow-hidden
                  ${
                    avatarUrl === avatar
                      ? "border-blue-600 shadow-md"
                      : "border-gray-200"
                  }`}
              >
                <img
                  src={avatar}
                  alt="Avatar option"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="customAvatar">Custom Avatar URL</Label>
            <Input
              id="customAvatar"
              value={avatarUrl}
              onChange={(e) => updateConfig({ avatarUrl: e.target.value })}
              placeholder="Enter custom avatar URL"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <Input
              type="color"
              value={primaryColor}
              onChange={(e) => updateConfig({ primaryColor: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Background Color</Label>
            <Input
              type="color"
              value={backgroundColor}
              onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Font Family</Label>
          <Select
            value={fontFamily}
            onValueChange={(value) => updateConfig({ fontFamily: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select font family" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Inter">Inter</SelectItem>
              <SelectItem value="Roboto">Roboto</SelectItem>
              <SelectItem value="Open Sans">Open Sans</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Position</Label>
          <RadioGroup
            value={position}
            onValueChange={(value) => updateConfig({ position: value })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bottom-right" id="bottom-right" />
              <Label htmlFor="bottom-right">Bottom Right</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bottom-left" id="bottom-left" />
              <Label htmlFor="bottom-left">Bottom Left</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>Bubble Style</Label>
          <RadioGroup
            value={bubbleStyle}
            onValueChange={(value) => updateConfig({ bubbleStyle: value })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="rounded" id="rounded" />
              <Label htmlFor="rounded">Rounded</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="square" id="square" />
              <Label htmlFor="square">Square</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>Button Style</Label>
          <RadioGroup
            value={buttonStyle}
            onValueChange={(value) => updateConfig({ buttonStyle: value })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="solid" id="solid" />
              <Label htmlFor="solid">Solid</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="outline" id="outline" />
              <Label htmlFor="outline">Outline</Label>
            </div>
          </RadioGroup>
        </div>
      </Card>
    </div>
  );
}