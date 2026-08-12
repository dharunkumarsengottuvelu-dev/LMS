"use client";
import { User, Save } from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminProfilePage() {
  return (
    <div className="space-y-8">
      <PageHeader 
        title="Admin Profile"
        description="Manage administrator account credentials and contact details"
      />
      <Card className="max-w-xl">
        <CardHeader className="p-6 pb-4"><CardTitle className="text-[18px]">Profile Details</CardTitle></CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <Input className="h-[44px]" defaultValue="System Administrator" />
          <Button className="h-[44px] bg-[#2563EB] text-white gap-2"><Save className="h-4 w-4" /> Save Profile</Button>
        </CardContent>
      </Card>
    </div>
  );
}
