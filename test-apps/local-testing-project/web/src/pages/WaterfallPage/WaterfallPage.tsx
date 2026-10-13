import WaterfallBlogPostCell from "src/components/WaterfallBlogPostCell/WaterfallBlogPostCell";

type WaterfallPageProps = {
  id: number;
};

const WaterfallPage = ({ id }: WaterfallPageProps) => <WaterfallBlogPostCell id={id} />;

export default WaterfallPage;
