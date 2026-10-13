import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";
import { createCell } from "@rwgql/cell";
import { gql } from "@apollo/client";
import type { EditPostById, UpdatePostInput, UpdatePostMutationVariables } from "types/graphql";

import { navigate, routes } from "@rwgql/router";
import type { CellSuccessProps, CellFailureProps } from "types/cell";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { useMutation } from "@apollo/client/react";
import { toast } from "react-hot-toast";

import PostForm from "src/components/Post/PostForm/PostForm";

export const QUERY: TypedDocumentNode<EditPostById> = gql`
  query EditPostById($id: Int!) {
    post: post(id: $id) {
      id
      title
      body
      authorId
      createdAt
    }
  }
`;

const UPDATE_POST_MUTATION: TypedDocumentNode<EditPostById, UpdatePostMutationVariables> = gql`
  mutation UpdatePostMutation($id: Int!, $input: UpdatePostInput!) {
    updatePost(id: $id, input: $input) {
      id
      title
      body
      authorId
      createdAt
    }
  }
`;

export const Empty = () => <div>Empty</div>;

export const Loading = () => <div>Loading...</div>;

export const Failure = ({ error }: CellFailureProps) => (
  <div className="rw-cell-error">{error?.message}</div>
);

export const Success = ({ post }: CellSuccessProps<EditPostById>) => {
  const [updatePost, { loading, error }] = useMutation(UPDATE_POST_MUTATION, {
    onCompleted: () => {
      toast.success("Post updated");
      navigate(routes.posts());
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSave = (input: UpdatePostInput, id: number | undefined) => {
    if (id === undefined) return;
    void updatePost({ variables: { id, input } });
  };

  if (!post) return <Empty />;
  return (
    <div className="rw-segment">
      <header className="rw-segment-header">
        <h2 className="rw-heading rw-heading-secondary">Edit Post {post?.id}</h2>
      </header>
      <div className="rw-segment-main">
        <PostForm post={post} onSave={onSave} error={error} loading={loading} />
      </div>
    </div>
  );
};

export default createCell<ResultOf<typeof QUERY>, VariablesOf<typeof QUERY>>({
  QUERY,
  Loading,
  Empty,
  Failure,
  Success,
});
