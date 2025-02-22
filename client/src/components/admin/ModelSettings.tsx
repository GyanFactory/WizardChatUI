import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ModelSettings as ModelSettingsType } from "@shared/schema";

const MODEL_TYPES = [
  { id: "opensource", name: "Open Source Models" },
  { id: "openai", name: "OpenAI" },
  { id: "huggingface", name: "Hugging Face" },
  { id: "deepseek", name: "DeepSeek" },
];

export function ModelSettings() {
  const { toast } = useToast();

  const { data: modelSettings, isLoading } = useQuery<ModelSettingsType[]>({
    queryKey: ["/api/admin/model-settings"],
  });

  const updateModelSettingMutation = useMutation({
    mutationFn: async ({
      id,
      isEnabled,
      priority,
    }: {
      id: number;
      isEnabled?: boolean;
      priority?: number;
    }) => {
      const response = await apiRequest(`/api/admin/model-settings/${id}`, {
        method: "PATCH",
        body: { isEnabled, priority },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/model-settings"] });
      toast({
        title: "Success",
        description: "Model settings updated successfully",
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

  if (isLoading) {
    return <div>Loading model settings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {MODEL_TYPES.map((model) => {
            const setting = modelSettings?.find((s) => s.name === model.id);
            return (
              <div key={model.id} className="flex items-center justify-between p-4 border rounded">
                <div>
                  <p className="font-medium">{model.name}</p>
                  <p className="text-sm text-gray-500">
                    Priority: {setting?.priority || 0}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    value={setting?.priority || 0}
                    onChange={(e) =>
                      updateModelSettingMutation.mutate({
                        id: setting?.id!,
                        priority: parseInt(e.target.value),
                      })
                    }
                    className="w-20"
                  />
                  <Switch
                    checked={setting?.isEnabled || false}
                    onCheckedChange={(checked) =>
                      updateModelSettingMutation.mutate({
                        id: setting?.id!,
                        isEnabled: checked,
                      })
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
