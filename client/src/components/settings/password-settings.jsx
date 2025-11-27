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
import { KeyRound, Search, Users, Eye, EyeOff } from "lucide-react"
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
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Set auth header for all requests
  useEffect(() => {
    if (token) {
      api.defaults.headers.common["x-auth-token"] = token
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
      await api.put(`/admin/users/${selectedUser._id}`, {
        password: newPassword
      })

      setShowPasswordDialog(false)
      setSelectedUser(null)
      setNewPassword("")
      setConfirmPassword("")
      setShowNewPassword(false)
      setShowConfirmPassword(false)

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

  return (
    <div className="space-y-6">
      {/* Employee Password Management */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="bg-gradient-to-r from-amber-500/5 to-transparent">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <KeyRound className="h-4 w-4 text-amber-500" />
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
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <Card
                  key={user._id}
                  className="border-l-4 border-l-amber-200 hover:border-l-amber-500 hover:shadow-md transition-all duration-200"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          {user.avatar ? (
                            <AvatarImage src={user.avatar} alt={user.name} />
                          ) : (
                            <AvatarFallback className="bg-amber-100 text-amber-700 font-semibold">
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
                        className="bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0"
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        Change Password
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>
                  {searchTerm ? `No employees found matching "${searchTerm}"` : "No employees found"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change Password Dialog with Show/Hide Password */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-[500px] border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50 to-white dark:from-gray-800 dark:to-gray-900">
          <DialogHeader className="pb-4 border-b border-amber-100 dark:border-amber-900">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                <KeyRound className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-amber-800 dark:from-amber-400 dark:to-amber-600 bg-clip-text text-transparent">
                  Update Password
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400 mt-1">
                  {selectedUser && (
                    <>
                      Change password for <strong className="text-gray-900 dark:text-gray-100">{selectedUser.name}</strong>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="grid gap-6 py-6">
            {/* New Password Field */}
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                New Password
              </Label>
              <div className="relative group">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-12 h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 bg-white dark:bg-gray-800 transition-all duration-200"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-10 w-10 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all duration-200"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-amber-600 dark:text-gray-500 dark:hover:text-amber-400 transition-colors" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 6 ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                <p className={`${newPassword.length >= 6 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  Must be at least 6 characters
                </p>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                Confirm New Password
              </Label>
              <div className="relative group">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-12 h-12 border-2 border-gray-200 dark:border-gray-700 focus:border-amber-500 dark:focus:border-amber-500 bg-white dark:bg-gray-800 transition-all duration-200"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-10 w-10 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all duration-200"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-amber-600 dark:text-gray-500 dark:hover:text-amber-400 transition-colors" />
                  )}
                </Button>
              </div>
              {confirmPassword && (
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-1.5 h-1.5 rounded-full ${newPassword === confirmPassword && confirmPassword.length >= 6 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <p className={`${newPassword === confirmPassword && confirmPassword.length >= 6 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {newPassword === confirmPassword && confirmPassword.length >= 6 ? 'Passwords match!' : 'Passwords must match'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-amber-100 dark:border-amber-900 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false)
                setSelectedUser(null)
                setNewPassword("")
                setConfirmPassword("")
                setShowNewPassword(false)
                setShowConfirmPassword(false)
              }}
              className="border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 h-11 px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-11 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

