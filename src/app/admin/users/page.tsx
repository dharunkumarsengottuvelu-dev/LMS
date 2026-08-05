"use client";

import { useState } from "react";
import { Users, Search, Plus, UserCheck, Shield, Trash2, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const mockUsers = [
  { id: "u1", name: "Dharunkumar Sengottuvelu", email: "dharunkumarsengottuvelu@gmail.com", role: "admin", status: "active", joined: "2026-08-01" },
  { id: "u2", name: "Alex Rivera", email: "alex.rivera@techcorp.com", role: "trainer", status: "active", joined: "2026-07-15" },
  { id: "u3", name: "Sarah Chen", email: "sarah.chen@techcorp.com", role: "student", status: "active", joined: "2026-07-20" },
  { id: "u4", name: "Michael Chang", email: "m.chang@enterprise.com", role: "student", status: "pending", joined: "2026-08-04" },
];

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");

  const filtered = mockUsers.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div>
          <h1 className="text-[36px] font-semibold leading-[44px] tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            User Directory & Access Control
          </h1>
          <p className="text-[16px] text-[#6B7280] dark:text-[#A1A1AA] mt-1">
            Manage system users, role assignments (Admin, Trainer, Student), and status privileges
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-[44px]" />
          </div>
          <Button className="h-[44px] bg-[#2563EB] text-white gap-2">
            <Plus className="h-4 w-4" /> Add New User
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F5F5F5] dark:bg-[#27272A] border-b border-[#E5E7EB] dark:border-[#27272A] text-xs font-semibold text-[#6B7280]">
              <tr>
                <th className="p-4 pl-6">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-[#FAFAFA] dark:hover:bg-[#18181B]/50 transition-colors">
                  <td className="p-4 pl-6 flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-[#2563EB]/10 text-[#2563EB] text-xs font-semibold">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{user.name}</p>
                      <p className="text-xs text-[#6B7280]">{user.email}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className="capitalize text-xs font-medium">{user.role}</Badge>
                  </td>
                  <td className="p-4">
                    <Badge className={user.status === "active" ? "bg-[#16A34A] text-white text-xs" : "bg-[#F59E0B] text-white text-xs"}>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-xs text-[#6B7280]">{user.joined}</td>
                  <td className="p-4 pr-6 text-right space-x-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B7280]"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#DC2626]"><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
