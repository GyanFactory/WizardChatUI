import { useWizardStore } from "@/store/wizardStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export default function QAManagement() {
  const { qaItems, addQAItem, updateQAItem, removeQAItem } = useWizardStore();
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  const handleAdd = () => {
    if (newQuestion && newAnswer) {
      addQAItem({ question: newQuestion, answer: newAnswer });
      setNewQuestion("");
      setNewAnswer("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Q&A Management</h2>
        <p className="text-gray-600 mb-6">
          Review, edit, and enhance the generated Q&A pairs.
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          {qaItems.map((item, index) => (
            <div
              key={index}
              className="p-4 border rounded-lg space-y-4 bg-gray-50"
            >
              <div className="space-y-2">
                <Input
                  value={item.question}
                  onChange={(e) =>
                    updateQAItem(index, {
                      ...item,
                      question: e.target.value,
                    })
                  }
                  placeholder="Question"
                />
                <Textarea
                  value={item.answer}
                  onChange={(e) =>
                    updateQAItem(index, {
                      ...item,
                      answer: e.target.value,
                    })
                  }
                  placeholder="Answer"
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeQAItem(index)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          ))}

          <div className="border-t pt-6 space-y-4">
            <h3 className="font-medium">Add New Q&A</h3>
            <div className="space-y-2">
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Enter new question"
              />
              <Textarea
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="Enter answer"
                rows={3}
              />
            </div>
            <Button onClick={handleAdd} disabled={!newQuestion || !newAnswer}>
              <Plus className="w-4 h-4 mr-2" />
              Add Q&A Pair
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
