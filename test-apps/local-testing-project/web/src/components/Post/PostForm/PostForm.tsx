import type { EditPostById, CreatePostInput } from "types/graphql";

import type { ErrorLike } from "@apollo/client";
import { formError } from "src/lib/formError";
import { Form, FormError, FieldError, Label, TextField, Submit } from "@cedarjs/forms";

type FormPost = NonNullable<EditPostById["post"]>;

interface PostFormProps {
  post?: EditPostById["post"];
  onSave: (data: CreatePostInput, id?: FormPost["id"]) => void;
  error?: ErrorLike;
  loading: boolean;
}

const PostForm = (props: PostFormProps) => {
  const onSubmit = (data: CreatePostInput) => {
    props.onSave(data, props?.post?.id);
  };

  return (
    <div className="rw-form-wrapper">
      <Form<CreatePostInput> onSubmit={onSubmit} error={formError(props.error)}>
        <FormError
          error={formError(props.error)}
          wrapperClassName="rw-form-error-wrapper"
          titleClassName="rw-form-error-title"
          listClassName="rw-form-error-list"
        />

        <Label name="title" className="rw-label" errorClassName="rw-label rw-label-error">
          Title
        </Label>

        <TextField
          name="title"
          defaultValue={props.post?.title}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="title" className="rw-field-error" />

        <Label name="body" className="rw-label" errorClassName="rw-label rw-label-error">
          Body
        </Label>

        <TextField
          name="body"
          defaultValue={props.post?.body}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="body" className="rw-field-error" />

        <Label name="authorId" className="rw-label" errorClassName="rw-label rw-label-error">
          Author id
        </Label>

        <TextField
          name="authorId"
          defaultValue={props.post?.authorId}
          className="rw-input"
          errorClassName="rw-input rw-input-error"
          validation={{ required: true }}
        />

        <FieldError name="authorId" className="rw-field-error" />

        <div className="rw-button-group">
          <Submit disabled={props.loading} className="rw-button rw-button-blue">
            Save
          </Submit>
        </div>
      </Form>
    </div>
  );
};

export default PostForm;
