import BlogIndexPage from "@/pages/blog/BlogIndexPage";

/** Legacy public URLs reuse the real published collection, never demo posts. */
export default function BlogPage() {
  return <BlogIndexPage />;
}
