"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical } from "lucide-react";


type Exercise = {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[];
  difficulty: string;
  is_time_based: boolean;
};

type WorkoutExercise = {
  exercise_id: string;
  sets: number;
  reps: number;
  duration_seconds?: number;
  weight?: number;
  rest_seconds: number;
  notes?: string;
};

type WorkoutExerciseFromDB = {
  exercise_id: string;
  sets: number;
  reps: number;
  duration_seconds: number | null;
  weight: number | null;
  rest_seconds: number;
  notes: string | null;
};

type WorkoutFormData = {
  client_id: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
};

type WorkoutFormDialogProps = {
  open: boolean;
  onClose: () => void;
  workoutId?: string; // For editing existing workouts
  defaultClientId?: string; // For default client selection
};

const supabase = createClient();

export function WorkoutFormDialog({ open, onClose, workoutId, defaultClientId }: WorkoutFormDialogProps) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<WorkoutFormData>({
    client_id: "",
    name: "",
    description: "",
    exercises: [],
  });

  // Get fitness clients (only active enrolled clients can have workouts)
  const clientsQuery = useQuery({
    queryKey: ["fitness-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_clients")
        .select("id, name, email")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });


  // Get all exercises
  const exercisesQuery = useQuery({
    queryKey: ["all-exercises"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("id, name, category, muscle_groups, difficulty, is_time_based")
        .order("name");
      if (error) throw error;
      return data as Exercise[];
    },
  });

  const loadWorkoutData = useCallback(async () => {
    if (!workoutId) return;

    const { data: template, error: templateError } = await supabase
      .from("workout_templates")
      .select(`
        id,
        client_id,
        name,
        description,
        template_exercises(
          exercise_id,
          sets,
          reps,
          duration_seconds,
          weight,
          rest_seconds,
          notes
        )
      `)
      .eq("id", workoutId)
      .single();

    if (templateError) {
      toast.error("Failed to load workout");
      console.error("Error loading workout:", templateError);
      return;
    }

    setFormData({
      client_id: template.client_id,
      name: template.name,
      description: template.description || "",
      exercises: template.template_exercises.map((ex: WorkoutExerciseFromDB) => ({
        exercise_id: ex.exercise_id,
        sets: ex.sets,
        reps: ex.reps,
        duration_seconds: ex.duration_seconds || undefined,
        weight: ex.weight || undefined,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes || undefined,
      })),
    });
  }, [workoutId]);

  // Load workout data if editing
  useEffect(() => {
    if (workoutId && open) {
      loadWorkoutData();
    } else if (!workoutId && open) {
      // Reset form for new workout
      setFormData({
        client_id: defaultClientId || "",
        name: "",
        description: "",
        exercises: [],
      });
    }
  }, [workoutId, open, defaultClientId, loadWorkoutData]);

  const createWorkoutMutation = useMutation({
    mutationFn: async (data: WorkoutFormData) => {
      // Create workout template
      const { data: template, error: templateError } = await supabase
        .from("workout_templates")
        .insert({
          client_id: data.client_id,
          name: data.name,
          description: data.description || null,
        })
        .select("id")
        .single();

      if (templateError) throw templateError;

      // Add exercises to template
      if (data.exercises.length > 0) {
        const exerciseData = data.exercises.map((ex, index) => ({
          template_id: template.id,
          exercise_id: ex.exercise_id,
          sets: ex.sets,
          reps: ex.reps,
          duration_seconds: ex.duration_seconds || null,
          weight: ex.weight || null,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes || null,
          sort_order: index,
        }));

        const { error: exercisesError } = await supabase
          .from("template_exercises")
          .insert(exerciseData);

        if (exercisesError) throw exercisesError;
      }

      return template;
    },
    onSuccess: () => {
      toast.success("Workout created successfully!");
      queryClient.invalidateQueries({ queryKey: ["workouts", defaultClientId] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create workout");
    },
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: async (data: WorkoutFormData) => {
      if (!workoutId) throw new Error("No workout ID provided");

      // Update workout template
      const { error: templateError } = await supabase
        .from("workout_templates")
        .update({
          client_id: data.client_id,
          name: data.name,
          description: data.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", workoutId);

      if (templateError) throw templateError;

      // Get existing template exercises to compare
      const { data: existingExercises, error: fetchError } = await supabase
        .from("template_exercises")
        .select("id, exercise_id, sets, reps, duration_seconds, weight, rest_seconds, notes, sort_order")
        .eq("template_id", workoutId)
        .order("sort_order");

      if (fetchError) throw fetchError;

      // Update existing exercises - we can safely update them even if they have logs
      // The logs remain valid and reference the exercise data correctly
      const updatePromises = existingExercises?.map(async (existing, index) => {
        const newExercise = data.exercises[index];
        if (!newExercise) return; // This exercise is being removed

        return await supabase
          .from("template_exercises")
          .update({
            exercise_id: newExercise.exercise_id,
            sets: newExercise.sets,
            reps: newExercise.reps,
            duration_seconds: newExercise.duration_seconds || null,
            weight: newExercise.weight || null,
            rest_seconds: newExercise.rest_seconds,
            notes: newExercise.notes || null,
            sort_order: index,
          })
          .eq("id", existing.id);
      }) || [];

      // Add new exercises (beyond the existing ones)
      const newExercises = data.exercises.slice(existingExercises?.length || 0);
      if (newExercises.length > 0) {
        const exerciseData = newExercises.map((ex, index) => ({
          template_id: workoutId,
          exercise_id: ex.exercise_id,
          sets: ex.sets,
          reps: ex.reps,
          duration_seconds: ex.duration_seconds || null,
          weight: ex.weight || null,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes || null,
          sort_order: (existingExercises?.length || 0) + index,
        }));

        updatePromises.push(
          (async () => {
            return await supabase.from("template_exercises").insert(exerciseData);
          })()
        );
      }

      // Execute all updates
      const results = await Promise.all(updatePromises);
      const errors = results.filter((result): result is NonNullable<typeof result> & { error: NonNullable<typeof result>['error'] } =>
        result != null && result.error != null
      );
      if (errors.length > 0) {
        console.error("Update errors:", errors);
        throw errors[0].error;
      }
    },
    onSuccess: () => {
      toast.success("Workout updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["workouts", defaultClientId] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update workout");
    },
  });

  const addExercise = () => {
    setFormData(prev => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        {
          exercise_id: "",
          sets: 3,
          reps: 10,
          rest_seconds: 60,
        }
      ]
    }));
  };

  const removeExercise = (index: number) => {
    setFormData(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  const updateExercise = (index: number, field: keyof WorkoutExercise, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) =>
        i === index ? { ...ex, [field]: value } : ex
      )
    }));
  };

  const getSelectedExercise = (exerciseId: string): Exercise | undefined => {
    return exercisesQuery.data?.find(ex => ex.id === exerciseId);
  };

  const handleSubmit = () => {
    if (!formData.client_id || !formData.name.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.exercises.some(ex => !ex.exercise_id)) {
      toast.error("Please select exercises for all workout items");
      return;
    }

    if (workoutId) {
      updateWorkoutMutation.mutate(formData);
    } else {
      createWorkoutMutation.mutate(formData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {workoutId ? "Edit Workout" : "Create New Workout"}
          </DialogTitle>
          <DialogDescription>
            {workoutId ? "Update workout details and exercises" : "Create a new workout plan for a client"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clientsQuery.data?.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Workout Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Upper Body Strength"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional workout description or notes"
              rows={3}
            />
          </div>

          {/* Exercises */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Exercises</h3>
              <Button onClick={addExercise} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Exercise
              </Button>
            </div>

            {formData.exercises.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <p>No exercises added yet.</p>
                    <p className="text-sm mt-1">Click &ldquo;Add Exercise&rdquo; to get started.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {formData.exercises.map((exercise, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-base">Exercise {index + 1}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExercise(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Exercise</Label>
                        <Select
                          value={exercise.exercise_id}
                          onValueChange={(value) => updateExercise(index, "exercise_id", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select exercise" />
                          </SelectTrigger>
                          <SelectContent>
                            {exercisesQuery.data?.map(ex => (
                              <SelectItem key={ex.id} value={ex.id}>
                                <div className="flex items-center gap-2">
                                  <span>{ex.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {ex.category}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Sets</Label>
                          <Input
                            type="number"
                            min="1"
                            value={exercise.sets}
                            onChange={(e) => updateExercise(index, "sets", parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            {getSelectedExercise(exercise.exercise_id)?.is_time_based ? "Duration (sec)" : "Reps"}
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            value={getSelectedExercise(exercise.exercise_id)?.is_time_based ? (exercise.duration_seconds || 30) : exercise.reps}
                            onChange={(e) => {
                              const selectedExercise = getSelectedExercise(exercise.exercise_id);
                              if (selectedExercise?.is_time_based) {
                                updateExercise(index, "duration_seconds", parseInt(e.target.value) || 30);
                              } else {
                                updateExercise(index, "reps", parseInt(e.target.value) || 1);
                              }
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Weight (lbs)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={exercise.weight || ""}
                            onChange={(e) => updateExercise(index, "weight", e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="Optional"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Rest (sec)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={exercise.rest_seconds}
                            onChange={(e) => updateExercise(index, "rest_seconds", parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                          value={exercise.notes || ""}
                          onChange={(e) => updateExercise(index, "notes", e.target.value)}
                          placeholder="Optional notes for this exercise"
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              createWorkoutMutation.isPending ||
              updateWorkoutMutation.isPending ||
              !formData.client_id ||
              !formData.name.trim()
            }
          >
            {createWorkoutMutation.isPending || updateWorkoutMutation.isPending
              ? "Saving..."
              : workoutId ? "Update Workout" : "Create Workout"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
