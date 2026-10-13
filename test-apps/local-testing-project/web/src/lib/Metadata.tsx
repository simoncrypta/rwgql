// React 19 hoists these tags into the document head.
export const Metadata = ({
  title,
  description,
  og = false,
}: {
  title: string;
  description?: string;
  og?: boolean;
}) => (
  <>
    <title>{title} | Cedar on Vite+</title>
    {description && <meta name="description" content={description} />}
    {og && (
      <>
        <meta property="og:title" content={title} />
        {description && <meta property="og:description" content={description} />}
      </>
    )}
  </>
);
