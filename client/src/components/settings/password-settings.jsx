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
import { KeyRound, Search, Users, Lock } from "lucide-react"
import axios from "axios"
import { API_URL } from "@/lib/api"

// Configure axios with base URL
const api = axios.create({
  baseURL: `${API_URL}`,
})

export function PasswordSettings() {
  const { toast } = useToast()
  const { user: currentUser, token } = useAuth()
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Set auth header for all requests
  useEffect(() => {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`
    }
  }, [token])

  // Fetch users if admin or manager
  useEffect(() => {
    if (currentUser && (currentUser.role === "Admin" || currentUser.role === "Manager")) {
      fetchUsers()
    }
  }, [currentUser])

  const fetchUsers = async () => {
    try {
      const response = await api.get("/admin/users")
      setUsers(response.data)
    } catch (err) {
      console.error("Error fetching users:", err)
    }
  }

  const handleChangePassword = async () => {
    // For admins changing other users' passwords
    if (selectedUser && selectedUser._id !== currentUser.id) {
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
        await api.put(`/admin/users/${selectedUser._id}`, {
          password: newPassword
        })

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
          description: err.response?.data?.error || "Failed to change password",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    } else {
      // User changing their own password
      if (!currentPassword || !newPassword || !confirmPassword) {
        toast({
          title: "Validation Error",
          description: "All fields are required",
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
        await api.put(`/admin/users/${currentUser.id}`, {
          password: newPassword
        })

        setShowPasswordDialog(false)
        setSelectedUser(null)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")

        toast({
          title: "Success",
          description: "Your password has been updated successfully",
        })
      } catch (err) {
        console.error("Error changing password:", err)
        toast({
          title: "Error",
          description: err.response?.data?.error || "Failed to change password",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
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
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <KeyRound className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">Employee Password Management</CardTitle>
                    <CardDescription className="mt-1">Search and change employee passwords</CardDescription>
                  </div>
                </div>
              </div>
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

            {/* Employee List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {filteredUsers.map((user) => (
                <Card
                  key={user._id}
                  className="border-l-4 border-l-purple-200 hover:border-l-purple-500 hover:shadow-md transition-all duration-200"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          {user.avatar ? (
                            <AvatarImage src={user.avatar} alt={user.name} />
                          ) : (
                            <AvatarFallback className="bg-purple-100 text-purple-700 font-semibold">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-semibold text-lg">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
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
                        variant="outline"
                        className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/30"
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        Change Password
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredUsers.length === 0 && (
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
            {selectedUser && selectedUser._id === currentUser.id && (
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
            )}
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

