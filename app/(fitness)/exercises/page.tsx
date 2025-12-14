"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAdminUIMode } from "@/hooks/use-admin-ui-mode";
import { shouldShowAdminFeatures } from "@/lib/utils";
import { Search, Dumbbell, PlayCircle, ExternalLink, Filter, Edit, Trash2, X, Plus, Clock } from "lucide-react";
import Image from "next/image";

type User = { id: string; email?: string } | null;

type Exercise = {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[];
  equipment: string[];
  instructions?: string;
  video_url?: string;
  difficulty: string;
  is_time_based: boolean;
  created_at: string;
};

type FitnessClient = {
  id: string;
  name: string;
  email?: string;
};

export default function ExercisesPage() {
  const supabase = useMemo(() => createClient(), []);
  const { adminUIMode } = useAdminUIMode();

  const [user, setUser] = useState<User>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [muscleGroupFilter, setMuscleGroupFilter] = useState<string>("all");

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    muscle_groups: [] as string[],
    equipment: [] as string[],
    instructions: "",
    video_url: "",
    difficulty: "",
    is_time_based: false
  });
  const [saving, setSaving] = useState(false);
  const [newMuscleGroup, setNewMuscleGroup] = useState("");
  const [newEquipment, setNewEquipment] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
        setIsAdmin(Boolean(profile?.is_admin));
      }
    };
    loadUser();
  }, [supabase]);

  // Get user's fitness client profile (only if active)
  const clientQuery = useQuery({
    queryKey: ["fitness-client", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<FitnessClient | null> => {
      const { data, error } = await supabase
        .from("fitness_clients")
        .select("id, name, email")
        .eq("email", user!.email)
        .eq("is_active", true)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      return data || null;
    },
  });

  // Get exercises - different queries for admin vs regular users
  const exercisesQuery = useQuery({
    queryKey: ["exercises", isAdmin, clientQuery.data?.id, searchQuery, categoryFilter, difficultyFilter, muscleGroupFilter],
    enabled: Boolean(user?.id) && (isAdmin || Boolean(clientQuery.data?.id)),
    queryFn: async (): Promise<Exercise[]> => {
      let query = supabase
        .from("exercises")
        .select("*, is_time_based")
        .order("name");

      // For non-admin users, only show exercises from their workouts
      if (!isAdmin && clientQuery.data?.id) {
        query = supabase
          .from("exercises")
          .select(`
            *,
            is_time_based,
            workout_exercises!inner(
              workouts!inner(
                client_id
              )
            )
          `)
          .eq("workouts.client_id", clientQuery.data.id)
          .order("name");
      }

      const { data, error } = await query;
      if (error) throw error;

      let exercises = data as Exercise[];

      // Apply client-side filters
      if (searchQuery) {
        exercises = exercises.filter(exercise =>
          exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exercise.muscle_groups.some(mg => mg.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }

      if (categoryFilter !== "all") {
        exercises = exercises.filter(exercise => exercise.category === categoryFilter);
      }

      if (difficultyFilter !== "all") {
        exercises = exercises.filter(exercise => exercise.difficulty === difficultyFilter);
      }

      if (muscleGroupFilter !== "all") {
        exercises = exercises.filter(exercise => exercise.muscle_groups.includes(muscleGroupFilter));
      }

      return exercises;
    },
  });

  const categories = ["strength", "cardio", "flexibility", "sports"];
  const difficulties = ["beginner", "intermediate", "advanced"];

  // Get unique muscle groups from exercises
  const muscleGroups = Array.from(
    new Set(
      exercisesQuery.data?.flatMap(exercise => exercise.muscle_groups) || []
    )
  ).sort();

  // Edit exercise functions
  const resetForm = () => {
    setEditForm({
      name: "",
      category: "",
      muscle_groups: [],
      equipment: [],
      instructions: "",
      video_url: "",
      difficulty: "",
      is_time_based: false
    });
    setNewMuscleGroup("");
    setNewEquipment("");
  };

  const openEditDialog = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setEditForm({
      name: exercise.name,
      category: exercise.category,
      muscle_groups: [...exercise.muscle_groups],
      equipment: [...(exercise.equipment || [])],
      instructions: exercise.instructions || "",
      video_url: exercise.video_url || "",
      difficulty: exercise.difficulty,
      is_time_based: exercise.is_time_based
    });
    setEditDialogOpen(true);
  };

  const saveExercise = async () => {
    if (!editingExercise) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("exercises")
        .update({
          name: editForm.name,
          category: editForm.category,
          muscle_groups: editForm.muscle_groups,
          equipment: editForm.equipment,
          instructions: editForm.instructions || null,
          video_url: editForm.video_url || null,
          difficulty: editForm.difficulty,
          is_time_based: editForm.is_time_based
        })
        .eq("id", editingExercise.id);

      if (error) throw error;

      // Update the local data
      exercisesQuery.refetch();
      setEditDialogOpen(false);
      setEditingExercise(null);
    } catch (error) {
      console.error("Failed to update exercise:", error);
    } finally {
      setSaving(false);
    }
  };

  const deleteExercise = async () => {
    if (!editingExercise) return;

    if (!confirm(`Are you sure you want to delete "${editingExercise.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("exercises")
        .delete()
        .eq("id", editingExercise.id);

      if (error) throw error;

      // Update the local data
      exercisesQuery.refetch();
      setEditDialogOpen(false);
      setEditingExercise(null);
    } catch (error) {
      console.error("Failed to delete exercise:", error);
    }
  };

  const addMuscleGroup = () => {
    if (newMuscleGroup.trim() && !editForm.muscle_groups.includes(newMuscleGroup.trim())) {
      setEditForm(prev => ({
        ...prev,
        muscle_groups: [...prev.muscle_groups, newMuscleGroup.trim()]
      }));
      setNewMuscleGroup("");
    }
  };

  const removeMuscleGroup = (muscle: string) => {
    setEditForm(prev => ({
      ...prev,
      muscle_groups: prev.muscle_groups.filter(m => m !== muscle)
    }));
  };

  const addEquipment = () => {
    if (newEquipment.trim() && !editForm.equipment.includes(newEquipment.trim())) {
      setEditForm(prev => ({
        ...prev,
        equipment: [...prev.equipment, newEquipment.trim()]
      }));
      setNewEquipment("");
    }
  };

  const removeEquipment = (item: string) => {
    setEditForm(prev => ({
      ...prev,
      equipment: prev.equipment.filter(e => e !== item)
    }));
  };

  // Helper function to get exercise image path
  const getExerciseImagePath = (exerciseName: string): string | null => {
    // Convert exercise name to a safe filename
    const safeName = exerciseName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();

    // Try different extensions in order of preference
    const extensions = ['.webp', '.jpg', '.jpeg', '.png'];
    for (const ext of extensions) {
      // Check if the file exists by trying to load it (this is a client-side check)
      // For now, we'll assume the file exists if we get to this point
      // In a real app, you might want to check file existence server-side
      return `/exercises/${safeName}${ext}`;
    }

    return null;
  };

  if (!user) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (!isAdmin && !clientQuery.data) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              You need a fitness client profile to view exercises. Contact your trainer to get set up.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exercises</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Browse and manage the exercise library"
              : "View exercises from your workout plans"
            }
          </p>
        </div>
        {shouldShowAdminFeatures(isAdmin, adminUIMode) && (
          <Dialog>
            <DialogTrigger asChild>
                <Button>
                <Dumbbell className="h-4 w-4 mr-2" />
                Create Exercise
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Exercise</DialogTitle>
                <DialogDescription>
                  Create a new exercise for the library. It will be available for all workout plans.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-name">Exercise Name *</Label>
                    <Input
                      id="add-name"
                      placeholder="e.g., Barbell Squat"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-category">Category *</Label>
                    <Select value={editForm.category} onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Difficulty */}
                <div className="space-y-2">
                  <Label htmlFor="add-difficulty">Difficulty Level *</Label>
                  <Select value={editForm.difficulty} onValueChange={(value) => setEditForm(prev => ({ ...prev, difficulty: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficulties.map(difficulty => (
                        <SelectItem key={difficulty} value={difficulty}>
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Time-based Exercise */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="add-time-based"
                    checked={editForm.is_time_based}
                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_time_based: checked }))}
                  />
                  <Label htmlFor="add-time-based" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time-based exercise (e.g., plank, wall sit)
                  </Label>
                </div>

                {/* Muscle Groups */}
                <div className="space-y-2">
                  <Label>Muscle Groups *</Label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {editForm.muscle_groups.map((muscle) => (
                      <Badge key={muscle} variant="secondary" className="cursor-pointer" onClick={() => removeMuscleGroup(muscle)}>
                        {muscle} <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add muscle group"
                      value={newMuscleGroup}
                      onChange={(e) => setNewMuscleGroup(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addMuscleGroup()}
                    />
                    <Button type="button" variant="outline" onClick={addMuscleGroup}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Equipment */}
                <div className="space-y-2">
                  <Label>Equipment</Label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {editForm.equipment.map((item) => (
                      <Badge key={item} variant="secondary" className="cursor-pointer" onClick={() => removeEquipment(item)}>
                        {item} <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add equipment"
                      value={newEquipment}
                      onChange={(e) => setNewEquipment(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addEquipment()}
                    />
                    <Button type="button" variant="outline" onClick={addEquipment}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-2">
                  <Label htmlFor="add-instructions">Instructions</Label>
                  <Textarea
                    id="add-instructions"
                    value={editForm.instructions}
                    onChange={(e) => setEditForm(prev => ({ ...prev, instructions: e.target.value }))}
                    placeholder="Describe how to perform this exercise..."
                    rows={4}
                  />
                </div>

                {/* Video URL */}
                <div className="space-y-2">
                  <Label htmlFor="add-video-url">Video URL (optional)</Label>
                  <Input
                    id="add-video-url"
                    type="url"
                    value={editForm.video_url}
                    onChange={(e) => setEditForm(prev => ({ ...prev, video_url: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={async () => {
                    if (!editForm.name.trim() || !editForm.category || editForm.muscle_groups.length === 0 || !editForm.difficulty) {
                      return;
                    }

                    setSaving(true);
                    try {
                      const { error } = await supabase
                        .from("exercises")
                        .insert({
                          name: editForm.name.trim(),
                          category: editForm.category,
                          muscle_groups: editForm.muscle_groups,
                          equipment: editForm.equipment,
                          instructions: editForm.instructions || null,
                          video_url: editForm.video_url || null,
                          difficulty: editForm.difficulty,
                          is_time_based: editForm.is_time_based,
                          created_by: user?.id
                        });

                      if (error) throw error;

                      // Reset form and close dialog
                      resetForm();

                      // Refresh exercises list
                      exercisesQuery.refetch();
                    } catch (error) {
                      console.error("Failed to create exercise:", error);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving || !editForm.name.trim() || !editForm.category || editForm.muscle_groups.length === 0 || !editForm.difficulty}
                >
                  {saving ? "Creating..." : "Create Exercise"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar - Full Width */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises or muscle groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Dropdowns - Second Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:flex-1">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-full sm:flex-1">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {difficulties.map(difficulty => (
                    <SelectItem key={difficulty} value={difficulty}>
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={muscleGroupFilter} onValueChange={setMuscleGroupFilter}>
                <SelectTrigger className="w-full sm:flex-1">
                  <SelectValue placeholder="Muscle Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Muscles</SelectItem>
                  {muscleGroups.map(muscle => (
                    <SelectItem key={muscle} value={muscle}>
                      {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercise Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {exercisesQuery.isLoading ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Loading exercises...</p>
              </CardContent>
            </Card>
          </div>
        ) : exercisesQuery.data?.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No exercises found.</p>
                  {searchQuery || categoryFilter !== "all" || difficultyFilter !== "all" || muscleGroupFilter !== "all" ? (
                    <p className="text-sm text-muted-foreground mt-2">
                      Try adjusting your filters or search terms.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">
                      {isAdmin ? "Add some exercises to get started." : "Check back later for new exercises."}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          exercisesQuery.data?.map((exercise) => (
            <Card key={exercise.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight">{exercise.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {exercise.category}
                      </Badge>
                      <Badge
                        variant={
                          exercise.difficulty === 'beginner' ? 'default' :
                          exercise.difficulty === 'intermediate' ? 'secondary' : 'destructive'
                        }
                        className="text-xs"
                      >
                        {exercise.difficulty}
                      </Badge>
                      {exercise.is_time_based && (
                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
                          <Clock className="h-3 w-3 mr-1" />
                          Time-based
                        </Badge>
                      )}
                    </div>
                  </div>
                  {shouldShowAdminFeatures(isAdmin, adminUIMode) && (
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(exercise)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Exercise Image */}
                {(() => {
                  const imagePath = getExerciseImagePath(exercise.name);
                  return imagePath ? (
                    <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden">
                      <Image
                        src={imagePath}
                        alt={`${exercise.name} exercise`}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          // Hide the image container if image fails to load
                          (e.target as HTMLElement).parentElement!.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : null;
                })()}

                {/* Muscle Groups */}
                <div>
                  <p className="text-sm font-medium mb-2">Target Muscles:</p>
                  <div className="flex flex-wrap gap-1">
                    {exercise.muscle_groups.map((muscle) => (
                      <Badge key={muscle} variant="outline" className="text-xs">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Equipment */}
                {exercise.equipment && exercise.equipment.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Equipment:</p>
                    <div className="flex flex-wrap gap-1">
                      {exercise.equipment.map((item) => (
                        <Badge key={item} variant="outline" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Instructions */}
                {exercise.instructions && (
                  <div>
                    <p className="text-sm font-medium mb-2">Instructions:</p>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {exercise.instructions}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {exercise.video_url && (
                    <Button variant="outline" size="sm" className="flex-1">
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Watch Video
                    </Button>
                  )}
                  {exercise.instructions && (
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Exercise Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Exercise</DialogTitle>
            <DialogDescription>
              Update exercise details. Changes will be reflected in all workout plans.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Exercise Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={editForm.category} onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <Label htmlFor="edit-difficulty">Difficulty Level</Label>
              <Select value={editForm.difficulty} onValueChange={(value) => setEditForm(prev => ({ ...prev, difficulty: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficulties.map(difficulty => (
                    <SelectItem key={difficulty} value={difficulty}>
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time-based Exercise */}
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-time-based"
                checked={editForm.is_time_based}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_time_based: checked }))}
              />
              <Label htmlFor="edit-time-based" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time-based exercise (e.g., plank, wall sit)
              </Label>
            </div>

            {/* Muscle Groups */}
            <div className="space-y-2">
              <Label>Muscle Groups</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {editForm.muscle_groups.map((muscle) => (
                  <Badge key={muscle} variant="secondary" className="cursor-pointer" onClick={() => removeMuscleGroup(muscle)}>
                    {muscle} <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add muscle group"
                  value={newMuscleGroup}
                  onChange={(e) => setNewMuscleGroup(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addMuscleGroup()}
                />
                <Button type="button" variant="outline" onClick={addMuscleGroup}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Equipment */}
            <div className="space-y-2">
              <Label>Equipment</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {editForm.equipment.map((item) => (
                  <Badge key={item} variant="secondary" className="cursor-pointer" onClick={() => removeEquipment(item)}>
                    {item} <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add equipment"
                  value={newEquipment}
                  onChange={(e) => setNewEquipment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addEquipment()}
                />
                <Button type="button" variant="outline" onClick={addEquipment}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <Label htmlFor="edit-instructions">Instructions</Label>
              <Textarea
                id="edit-instructions"
                value={editForm.instructions}
                onChange={(e) => setEditForm(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="Describe how to perform this exercise..."
                rows={4}
              />
            </div>

            {/* Video URL */}
            <div className="space-y-2">
              <Label htmlFor="edit-video-url">Video URL (optional)</Label>
              <Input
                id="edit-video-url"
                type="url"
                value={editForm.video_url}
                onChange={(e) => setEditForm(prev => ({ ...prev, video_url: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="destructive" onClick={deleteExercise} disabled={saving}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Exercise
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={saveExercise} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
