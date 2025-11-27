"use client"

import { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { useToast } from "../../hooks/use-toast"
import { useAuth } from "@/context/auth-context"
import { KeyRound, Search, Users, Lock, RefreshCw } from "lucide-react"
import { API_URL } from "@/lib/api"

export function PasswordSettings() {
  const { toast } = useToast()
  const { user: currentUser, getToken } = useAuth()
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  // Fetch users if admin or manager
  useEffect(() => {
    if (currentUser && (currentUser.role === "Admin" || currentUser.role === "Manager")) {
      fetchUsers()
    }
  }, [currentUser])

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true)
      const token = getToken()
      
      console.log("🔑 Token exists:", !!token)
      console.log("🌐 API URL:", API_URL)
      console.log("👤 Current user role:", currentUser?.role)
      console.log("📍 Full URL:", `${API_URL}/admin/users`)
      
      if (!token) {
        throw new Error("No authentication token found. Please log in again.")
      }
      
      const response = await fetch(`${API_URL}/admin/users`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
      })

      console.log("📡 Response status:", response.status)

      if (response.status === 401) {
        throw new Error("Unauthorized. Your session may have expired. Please log out and log in again.")
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch users: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("✅ Fetched users successfully:", data.length, "employees")
      setUsers(data)
      
      toast({
        title: "Success",
        description: `Loaded ${data.length} employees`,
      })
    } catch (err) {
      console.error("❌ Error fetching users:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to load employees. Please check your permissions.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const handleChangePassword = async () => {
    if (!selectedUser) {
      toast({
        title: "Error",
        description: "No user selected",
        variant: "destructive",
      })
      return
    }

    if (!newPassword || !confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please enter and confirm the new password",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      const token = getToken()
      
      if (!token) {
        throw new Error("No authentication token found. Please log in again.")
      }
      
      const response = await fetch(`${API_URL}/admin/users/${selectedUser._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
        body: JSON.stringify({
          password: newPassword
        })
      })

      if (response.status === 401) {
        throw new Error("Unauthorized. Your session may have expired. Please log out and log in again.")
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update password")
      }

      setShowPasswordDialog(false)
      setSelectedUser(null)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      toast({
        title: "Success",
        description: `Password updated successfully for ${selectedUser.name}`,
      })
    } catch (err) {
      console.error("Error changing password:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to change password",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const getRoleBadge = (role) => {
    switch (role) {
      case "Admin":
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300">
            Admin
          </Badge>
        )
      case "Manager":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300">
            Manager
          </Badge>
        )
      case "User":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300">
            User
          </Badge>
        )
      default:
        return <Badge>{role}</Badge>
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Check if user is admin or manager
  const isAdminOrManager = currentUser && (currentUser.role === "Admin" || currentUser.role === "Manager")

  return (
    <div className="space-y-6">
      {/* Own Password Section */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="bg-gradient-to-r from-amber-500/5 to-transparent">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Lock className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-base">Update Your Password</CardTitle>
              <CardDescription className="text-xs">Change your password to keep your account secure</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Button
            onClick={() => {
              setSelectedUser(currentUser)
              setShowPasswordDialog(true)
            }}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            Change My Password
          </Button>
        </CardContent>
      </Card>

      {/* Employee Password Management (Admin/Manager Only) */}
      {isAdminOrManager && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="bg-gradient-to-r from-purple-500/5 to-transparent">
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <KeyRound className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Employee Password Management</CardTitle>
                  <CardDescription className="mt-1">Search and change employee passwords</CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={isLoadingUsers}
                className="flex-shrink-0"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>

            {/* Employee Count */}
            {!isLoadingUsers && users.length > 0 && (
              <div className="mb-4 text-sm text-muted-foreground">
                Showing {filteredUsers.length} of {users.length} employees
              </div>
            )}

            {/* Employee List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {isLoadingUsers ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p>Loading employees...</p>
                </div>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <Card
                    key={user._id}
                    className="border-l-4 border-l-purple-200 hover:border-l-purple-500 hover:shadow-md transition-all duration-200 cursor-pointer"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <Avatar className="h-12 w-12 flex-shrink-0">
                            {user.avatar ? (
                              <AvatarImage src={user.avatar} alt={user.name} />
                            ) : (
                              <AvatarFallback className="bg-purple-100 text-purple-700 font-semibold">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-lg truncate">{user.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {getRoleBadge(user.role)}
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedUser(user)
                            setShowPasswordDialog(true)
                          }}
                          className="bg-purple-500 hover:bg-purple-600 text-white flex-shrink-0"
                        >
                          <KeyRound className="mr-2 h-4 w-4" />
                          Change Password
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No employees found in the system</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No employees found matching "{searchTerm}"</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" />
              Update Password
            </DialogTitle>
            <DialogDescription>
              {selectedUser && selectedUser._id === currentUser.id ? (
                "Change your password to keep your account secure"
              ) : (
                <>
                  Update password for <strong>{selectedUser?.name}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Must match new password
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false)
                setSelectedUser(null)
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={isLoading}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

