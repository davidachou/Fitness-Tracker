"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, UserCheck, UserX, Search } from "lucide-react";

type User = { id: string; email?: string } | null;

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
};

type FitnessClient = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  created_by?: string;
};

// Hardcoded admin allow-list for initial access
// TODO: Update this with your admin email address
const ADMIN_ALLOW_LIST = ['admin@yourdomain.com'];

export default function FitnessClientsAdminPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [user, setUser] = useState<User>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<FitnessClient | null>(null);
  const [deleteClientConfirm, setDeleteClientConfirm] = useState<{
    open: boolean;
    client: FitnessClient | null;
  }>({ open: false, client: null });

  // Form data
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [clientForm, setClientForm] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
    is_active: true
  });

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          redirect('/auth/login?message=Access denied');
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        const isAdminUser = ADMIN_ALLOW_LIST.includes(user.email!) || profile?.is_admin === true;

        if (!isAdminUser) {
          redirect('/dashboard');
        }

        setUser(user);
        setIsAdmin(true);
      } catch (error) {
        console.error('Admin check failed:', error);
        redirect('/auth/login?message=Access denied');
      } finally {
        setLoading(false);
      }
    };
    checkAdmin();
  }, [supabase]);

  // Get all profiles (for creating new fitness clients)
  const profilesQuery = useQuery({
    queryKey: ["all-profiles"],
    enabled: isAdmin,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  // Get all fitness clients
  const clientsQuery = useQuery({
    queryKey: ["all-fitness-clients-admin"],
    enabled: isAdmin,
    queryFn: async (): Promise<FitnessClient[]> => {
      const { data, error } = await supabase
        .from("fitness_clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Filter clients based on search and status
  const filteredClients = clientsQuery.data?.filter(client => {
    const matchesSearch = !searchQuery ||
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && client.is_active) ||
      (statusFilter === "inactive" && !client.is_active);

    return matchesSearch && matchesStatus;
  }) || [];

  // Create fitness client mutation
  const createClientMutation = useMutation({
    mutationFn: async (data: typeof clientForm & { profile_id: string }) => {
      // Create fitness client
      const { data: newClient, error } = await supabase
        .from("fitness_clients")
        .insert({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          notes: data.notes || null,
          is_active: data.is_active,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return newClient;
    },
    onSuccess: () => {
      toast.success("Fitness client created successfully!");
      queryClient.invalidateQueries({ queryKey: ["all-fitness-clients-admin"] });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create fitness client");
    },
  });

  // Update fitness client mutation
  const updateClientMutation = useMutation({
    mutationFn: async (data: typeof clientForm & { id: string }) => {
      const { error } = await supabase
        .from("fitness_clients")
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          notes: data.notes || null,
          is_active: data.is_active,
        })
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fitness client updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["all-fitness-clients-admin"] });
      setEditDialogOpen(false);
      setEditingClient(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update fitness client");
    },
  });

  // Delete fitness client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from("fitness_clients")
        .delete()
        .eq("id", clientId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fitness client deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["all-fitness-clients-admin"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete fitness client");
    },
  });

  const resetForm = () => {
    setSelectedProfileId("");
    setClientForm({
      name: "",
      email: "",
      phone: "",
      notes: "",
      is_active: true
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const openEditDialog = (client: FitnessClient) => {
    setEditingClient(client);
    setClientForm({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      notes: client.notes || "",
      is_active: client.is_active
    });
    setEditDialogOpen(true);
  };

  const handleProfileSelect = (profileId: string) => {
    setSelectedProfileId(profileId);
    const profile = profilesQuery.data?.find(p => p.id === profileId);
    if (profile) {
      setClientForm(prev => ({
        ...prev,
        name: profile.full_name || profile.email || "",
        email: profile.email
      }));
    }
  };

  const handleCreate = () => {
    if (!selectedProfileId || !clientForm.name.trim()) {
      toast.error("Please select a user and provide a name");
      return;
    }

    createClientMutation.mutate({
      ...clientForm,
      profile_id: selectedProfileId
    });
  };

  const handleUpdate = () => {
    if (!editingClient || !clientForm.name.trim()) {
      toast.error("Please provide a name");
      return;
    }

    updateClientMutation.mutate({
      ...clientForm,
      id: editingClient.id
    });
  };

  const handleDelete = (client: FitnessClient) => {
    setDeleteClientConfirm({ open: true, client });
  };

  const confirmDeleteClient = () => {
    if (deleteClientConfirm.client) {
      deleteClientMutation.mutate(deleteClientConfirm.client.id);
      setDeleteClientConfirm({ open: false, client: null });
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!isAdmin || !user) {
    return (
      <div className="py-10 text-center text-destructive">
        Access denied. Admin privileges required.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Fitness Clients</h1>
          <p className="text-muted-foreground">
            Manage fitness client enrollments and profiles
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Fitness Clients ({filteredClients.length})</CardTitle>
          <CardDescription>
            Manage client enrollments, contact info, and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientsQuery.isLoading ? (
            <p>Loading clients...</p>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No clients found.</p>
              {searchQuery || statusFilter !== "all" ? (
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your filters.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  Add your first fitness client to get started.
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.email || "—"}</TableCell>
                    <TableCell>{client.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={client.is_active ? "default" : "secondary"}>
                        {client.is_active ? (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <UserX className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(client.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(client)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(client)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Client Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Fitness Client</DialogTitle>
            <DialogDescription>
              Create a fitness profile for an existing user
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={selectedProfileId} onValueChange={handleProfileSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {profilesQuery.data?.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-name">Display Name *</Label>
              <Input
                id="create-name"
                value={clientForm.name}
                onChange={(e) => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Name shown in the app"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={clientForm.email}
                onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-phone">Phone</Label>
              <Input
                id="create-phone"
                value={clientForm.phone}
                onChange={(e) => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Optional contact number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-notes">Notes</Label>
              <Textarea
                id="create-notes"
                value={clientForm.notes}
                onChange={(e) => setClientForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about the client"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="create-active"
                checked={clientForm.is_active}
                onCheckedChange={(checked) => setClientForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="create-active">Active client</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createClientMutation.isPending}
            >
              {createClientMutation.isPending ? "Creating..." : "Create Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Fitness Client</DialogTitle>
            <DialogDescription>
              Update client information and status
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Display Name *</Label>
              <Input
                id="edit-name"
                value={clientForm.name}
                onChange={(e) => setClientForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={clientForm.email}
                onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={clientForm.phone}
                onChange={(e) => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={clientForm.notes}
                onChange={(e) => setClientForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-active"
                checked={clientForm.is_active}
                onCheckedChange={(checked) => setClientForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="edit-active">Active client</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateClientMutation.isPending}
            >
              {updateClientMutation.isPending ? "Updating..." : "Update Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Client Confirmation Dialog */}
      <Dialog
        open={deleteClientConfirm.open}
        onOpenChange={(open) => setDeleteClientConfirm({ open, client: open ? deleteClientConfirm.client : null })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Client
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>&quot;{deleteClientConfirm.client?.name}&quot;</strong>?
              <br />
              <span className="text-muted-foreground">
                This will also delete all their workouts and cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteClientConfirm({ open: false, client: null })}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteClient}
              disabled={deleteClientMutation.isPending}
              className="flex-1"
            >
              {deleteClientMutation.isPending ? "Deleting..." : "Delete Client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
