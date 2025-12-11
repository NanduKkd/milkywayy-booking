import { YouTubeEmbed } from 'react-social-media-embed';

const LongForm = ({ items }) => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mb-12">
      {items.map((item, index) => (
        <div
          key={`long-${index}`}
          className="group relative h-[360px] w-[328px] bg-card rounded-xl overflow-hidden cursor-pointer fade-in"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted">
            <YouTubeEmbed url="https://www.youTube.com/watch?v=4jnzf1yj48M" width={328} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default LongForm;
