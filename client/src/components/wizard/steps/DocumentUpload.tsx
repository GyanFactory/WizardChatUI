import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, File, X } from "lucide-react";
import { useState } from "react";

export default function DocumentUpload() {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Upload Training Document</h2>
        <p className="text-gray-600 mb-6">
          Upload a PDF document containing your knowledge base. We'll use this to generate Q&A pairs.
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8">
            <div className="flex flex-col items-center justify-center">
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
              <Label
                htmlFor="file-upload"
                className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Choose PDF File
              </Label>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={handleFileChange}
              />
              <p className="mt-2 text-sm text-gray-500">
                or drag and drop your file here
              </p>
            </div>
          </div>

          {file && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <File className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
