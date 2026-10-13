import { Metadata } from "src/lib/Metadata";

import AggregatedBlogPostCell from "src/components/AggregatedBlogPostCell/AggregatedBlogPostCell";

type AggregatedBlogPostPageProps = {
  id: number;
};

const AggregatedBlogPostPage = ({ id }: AggregatedBlogPostPageProps) => {
  return (
    <>
      <Metadata title={`Aggregated Post ${id}`} />

      <AggregatedBlogPostCell id={id} />
    </>
  );
};

export default AggregatedBlogPostPage;
