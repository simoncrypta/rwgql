import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";
import { createCell } from "@rwgql/cell";
import { gql } from "@apollo/client";
import type {
  EditContactById,
  UpdateContactInput,
  UpdateContactMutationVariables,
} from "types/graphql";

import { navigate, routes } from "@rwgql/router";
import type { CellSuccessProps, CellFailureProps } from "types/cell";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { useMutation } from "@apollo/client/react";
import { toast } from "react-hot-toast";

import ContactForm from "src/components/Contact/ContactForm/ContactForm";

export const QUERY: TypedDocumentNode<EditContactById> = gql`
  query EditContactById($id: Int!) {
    contact: contact(id: $id) {
      id
      name
      email
      message
      createdAt
    }
  }
`;

const UPDATE_CONTACT_MUTATION: TypedDocumentNode<EditContactById, UpdateContactMutationVariables> =
  gql`
    mutation UpdateContactMutation($id: Int!, $input: UpdateContactInput!) {
      updateContact(id: $id, input: $input) {
        id
        name
        email
        message
        createdAt
      }
    }
  `;

export const Empty = () => <div>Empty</div>;

export const Loading = () => <div>Loading...</div>;

export const Failure = ({ error }: CellFailureProps) => (
  <div className="rw-cell-error">{error?.message}</div>
);

export const Success = ({ contact }: CellSuccessProps<EditContactById>) => {
  const [updateContact, { loading, error }] = useMutation(UPDATE_CONTACT_MUTATION, {
    onCompleted: () => {
      toast.success("Contact updated");
      navigate(routes.contacts());
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSave = (input: UpdateContactInput, id: number | undefined) => {
    if (id === undefined) return;
    void updateContact({ variables: { id, input } });
  };

  if (!contact) return <Empty />;
  return (
    <div className="rw-segment">
      <header className="rw-segment-header">
        <h2 className="rw-heading rw-heading-secondary">Edit Contact {contact?.id}</h2>
      </header>
      <div className="rw-segment-main">
        <ContactForm contact={contact} onSave={onSave} error={error} loading={loading} />
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
