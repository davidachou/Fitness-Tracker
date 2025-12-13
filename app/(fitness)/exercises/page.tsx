"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminUIMode } from "@/hooks/use-admin-ui-mode";
import { shouldShowAdminFeatures } from "@/lib/utils";
import { Search, Dumbbell, PlayCircle, ExternalLink, Filter } from "lucide-react";

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

  // Get user's fitness client profile
  const clientQuery = useQuery({
    queryKey: ["fitness-client", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<FitnessClient | null> => {
      const { data, error } = await supabase
        .from("fitness_clients")
        .select("id, name, email")
        .eq("email", user!.email)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      return data || null;
    },
  });

  // Get exercises - different queries for admin vs regular users
  const exercisesQuery = useQuery({
    queryKey: ["exercises", isAdmin, clientQuery.data?.id, searchQuery, categoryFilter, difficultyFilter],
    enabled: Boolean(user?.id) && (isAdmin || Boolean(clientQuery.data?.id)),
    queryFn: async (): Promise<Exercise[]> => {
      let query = supabase
        .from("exercises")
        .select("*")
        .order("name");

      // For non-admin users, only show exercises from their workouts
      if (!isAdmin && clientQuery.data?.id) {
        query = supabase
          .from("exercises")
          .select(`
            *,
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

      return exercises;
    },
  });

  const categories = ["strength", "cardio", "flexibility", "sports"];
  const difficulties = ["beginner", "intermediate", "advanced"];

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
          <Button>
            <Dumbbell className="h-4 w-4 mr-2" />
            Add Exercise
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search exercises or muscle groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
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
              <SelectTrigger className="w-full sm:w-48">
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
                  {searchQuery || categoryFilter !== "all" || difficultyFilter !== "all" ? (
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
                    </div>
                  </div>
                  {shouldShowAdminFeatures(isAdmin, adminUIMode) && (
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
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
    </div>
  );
}
