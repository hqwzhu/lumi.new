export interface User {
  username: string;
  role: string;
  phone?: string;
}

export async function register(username: string, password: string, phone: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password, phone }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Registration failed");
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Login failed");
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMe(): Promise<{ user: User } | null> {
  try {
    const response = await fetch("/api/auth/me");
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}
