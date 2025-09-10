"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error("Authentication required")
  }

  const profileData = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    middle_name: (formData.get("middle_name") as string) || null,
    phone: formData.get("phone") as string,
    nrc_passport: formData.get("nrc_passport") as string,
    date_of_birth: (formData.get("date_of_birth") as string) || null,
    gender: (formData.get("gender") as string) || null,
    nationality: (formData.get("nationality") as string) || "Zambian",
    address: (formData.get("address") as string) || null,
    city: (formData.get("city") as string) || null,
    province: (formData.get("province") as string) || null,
    postal_code: (formData.get("postal_code") as string) || null,
    emergency_contact_name: (formData.get("emergency_contact_name") as string) || null,
    emergency_contact_phone: (formData.get("emergency_contact_phone") as string) || null,
    preferred_language: (formData.get("preferred_language") as string) || "en",
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from("user_profiles").upsert({ id: user.id, ...profileData })

  if (error) {
    throw new Error("Failed to update profile: " + error.message)
  }

  revalidatePath("/dashboard")
  revalidatePath("/profile")
}

export async function getProfile() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return null
  }

  const { data: profile, error } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

  if (error) {
    return null
  }

  return profile
}
