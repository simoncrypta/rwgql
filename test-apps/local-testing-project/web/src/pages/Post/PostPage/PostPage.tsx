import PostCell from "src/components/Post/PostCell/PostCell";

type PostPageProps = {
  id: number;
};

const PostPage = ({ id }: PostPageProps) => {
  return <PostCell id={id} />;
};

export default PostPage;
