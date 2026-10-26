import { Experience } from "@/features/home/Experience";
import { getBlogList } from "@/features/blog/lib/api";
import { toJournalPost, type JournalPost } from "@/features/home/journal/types";

/** The home page must still render if the blog API is down; the journal section just hides. */
async function latestPosts(): Promise<JournalPost[]> {
  try {
    return (await getBlogList()).slice(0, 2).map(toJournalPost);
  } catch {
    return [];
  }
}

export default async function Home() {
  const posts = await latestPosts();
  return (
    <main>
      <Experience posts={posts} />
    </main>
  );
}
