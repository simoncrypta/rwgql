// import { Link, routes } from '@rwgql/router'
import { Metadata } from "src/lib/Metadata";

type BlogPostPageProps = {
  id: number;
};

import BlogPostCell from "src/components/BlogPostCell/BlogPostCell";

const BlogPostPage = ({ id }: BlogPostPageProps) => {
  return (
    <>
      <Metadata title={`Post ${id}`} description={`Description ${id}`} og />

      <BlogPostCell id={id} />
    </>
  );
};

export default BlogPostPage;
