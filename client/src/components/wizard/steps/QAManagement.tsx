import { useWizardStore } from "@/store/wizardStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface QAItem {
  id: number;
  question: string;
  answer: string;
  isGenerated: boolean;
}

export default function QAManagement() {
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");

  const queryClient = useQueryClient();

  // Fetch QA items
  const { data: qaItems = [], isLoading } = useQuery({
    queryKey: ['/api/qa-items'],
  });

  // Add new QA item
  const addMutation = useMutation({
    mutationFn: async (item: { question: string; answer: string }) => {
      const res = await apiRequest('POST', '/api/qa-items', item);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/qa-items'] });
      setNewQuestion("");
      setNewAnswer("");
      toast({
        title: "Success",
        description: "Q&A pair added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update QA item
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<QAItem> }) => {
      const res = await apiRequest('PATCH', `/api/qa-items/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/qa-items'] });
      setEditingId(null);
      toast({
        title: "Success",
        description: "Q&A pair updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete QA item
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/qa-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/qa-items'] });
      toast({
        title: "Success",
        description: "Q&A pair deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAdd = () => {
    if (newQuestion && newAnswer) {
      addMutation.mutate({ question: newQuestion, answer: newAnswer });
    }
  };

  const handleEdit = (item: QAItem) => {
    setEditingId(item.id);
    setEditQuestion(item.question);
    setEditAnswer(item.answer);
  };

  const handleSave = (id: number) => {
    updateMutation.mutate({
      id,
      data: {
        question: editQuestion,
        answer: editAnswer,
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Q&A Management</h2>
        <p className="text-gray-600 mb-6">
          Review, edit, and enhance the Q&A pairs. You can also add new ones manually.
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-4">Loading Q&A pairs...</div>
          ) : (
            qaItems.map((item: QAItem) => (
              <div
                key={item.id}
                className="p-4 border rounded-lg space-y-4 bg-gray-50"
              >
                {editingId === item.id ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Input
                        value={editQuestion}
                        onChange={(e) => setEditQuestion(e.target.value)}
                        placeholder="Question"
                      />
                      <Textarea
                        value={editAnswer}
                        onChange={(e) => setEditAnswer(e.target.value)}
                        placeholder="Answer"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(item.id)}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <p className="font-medium">Q: {item.question}</p>
                      <p className="text-gray-600">A: {item.answer}</p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}

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
            <Button 
              onClick={handleAdd} 
              disabled={!newQuestion || !newAnswer || addMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Q&A Pair
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}