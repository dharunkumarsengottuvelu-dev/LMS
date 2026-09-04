export interface CodingDiscussPost {
  id: string;
  problemId?: string;
  title: string;
  content: string;
  author: {
    name: string;
    avatar?: string;
    role: "student" | "trainer" | "admin";
    badge?: string;
  };
  upvotes: number;
  commentsCount: number;
  tags: string[];
  createdAt: string;
}

let cachedPosts: CodingDiscussPost[] = [];

export class CodingDiscussService {
  /**
   * Fetches discussion posts dynamically from the backend database API
   */
  public static async fetchPosts(problemId?: string): Promise<CodingDiscussPost[]> {
    try {
      const url = problemId ? `/api/coding/discuss?problemId=${encodeURIComponent(problemId)}` : "/api/coding/discuss";
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        console.error("Failed to fetch discuss posts, status:", res.status);
        return cachedPosts;
      }

      const data = await res.json();
      if (data && Array.isArray(data.posts)) {
        cachedPosts = data.posts;
        return data.posts;
      }
    } catch (err) {
      console.error("Error fetching discuss posts from database:", err);
    }
    return cachedPosts;
  }

  /**
   * Synchronous getter returning current cached posts
   */
  public static getPosts(problemId?: string): CodingDiscussPost[] {
    if (problemId) {
      return cachedPosts.filter((p) => p.problemId === problemId || !p.problemId);
    }
    return cachedPosts;
  }

  /**
   * Creates a discussion post in the database
   */
  public static async addPost(
    post: Omit<CodingDiscussPost, "id" | "upvotes" | "commentsCount" | "createdAt" | "author"> & {
      author?: { name: string; avatar?: string; role?: "student" | "trainer" | "admin"; badge?: string };
    }
  ): Promise<CodingDiscussPost | null> {
    try {
      const res = await fetch("/api/coding/discuss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(post),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.post) {
          cachedPosts.unshift(data.post);
          return data.post;
        }
      }
    } catch (err) {
      console.error("Error adding discuss post to database:", err);
    }
    return null;
  }

  /**
   * Upvotes a post in the database
   */
  public static async upvotePost(id: string): Promise<void> {
    try {
      // Optimistic update
      const p = cachedPosts.find((item) => item.id === id);
      if (p) p.upvotes += 1;

      await fetch("/api/coding/discuss", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.error("Error upvoting discuss post in database:", err);
    }
  }
}
