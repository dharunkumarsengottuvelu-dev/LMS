import { INITIAL_DISCUSS_POSTS, type CodingDiscussPost } from "@/data/coding-problems-data";
export type { CodingDiscussPost } from "@/data/coding-problems-data";

const LOCAL_STORAGE_DISCUSS_KEY = "falcon_coding_discuss_v2";

export class CodingDiscussService {
  private static posts: CodingDiscussPost[] = [...INITIAL_DISCUSS_POSTS];

  private static isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  private static loadPosts(): CodingDiscussPost[] {
    if (!this.isBrowser()) return this.posts;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_DISCUSS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.posts = parsed;
          return parsed;
        }
      }
    } catch {}
    return this.posts;
  }

  private static savePosts(): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_DISCUSS_KEY, JSON.stringify(this.posts));
    } catch {}
  }

  public static getPosts(problemId?: string): CodingDiscussPost[] {
    const list = this.loadPosts();
    if (problemId) {
      return list.filter((p) => p.problemId === problemId || !p.problemId);
    }
    return list;
  }

  public static addPost(post: Omit<CodingDiscussPost, "id" | "upvotes" | "commentsCount" | "createdAt">): CodingDiscussPost {
    const newPost: CodingDiscussPost = {
      ...post,
      id: `disc-${Date.now()}`,
      upvotes: 1,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.posts.unshift(newPost);
    this.savePosts();
    return newPost;
  }

  public static upvotePost(id: string): void {
    const p = this.posts.find((item) => item.id === id);
    if (p) {
      p.upvotes += 1;
      this.savePosts();
    }
  }
}
