import { gql } from "@apollo/client";
import Author from "src/components/Author/Author";

export const FRAGMENT = gql`
  fragment AuthorFragmentCell_author on User {
    id
    email
    fullName
  }
`;

interface SuccessProps {
  author: {
    id: string;
    email: string;
    fullName: string;
  };
}

export const Success = ({ author }: SuccessProps) => (
  <span className="author-fragment-cell">
    <Author author={author} />
  </span>
);

export default Success;
