import { InstagramEmbed } from 'react-social-media-embed';

const ShortForm = ({ items }) => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mb-12">
      {items.map((item, index) => (
        <div
          key={`short-${index}`}
          className="group relative aspect-[9/15] w-[328px] bg-card rounded-xl overflow-hidden cursor-pointer fade-in"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted">
            <InstagramEmbed
              url={'https://www.instagram.com/reel/DQ9SUZoCaZZ'}
              width={328}
            />
          </div>
          {/*
            <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
              <div>
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.category}</p>
              </div>
            </div>
          */}
        </div>
      ))}
    </div>
  );
};

export default ShortForm;
