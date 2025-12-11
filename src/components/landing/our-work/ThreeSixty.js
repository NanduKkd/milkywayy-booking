const ThreeSixty = ({ items }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
      {items.map((item, index) => (
        <div
          key={`360-${index}`}
          className="group relative aspect-[4/3] bg-card rounded-xl overflow-hidden cursor-pointer fade-in"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted">
          </div>
          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
            <div>
              <p className="font-medium text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.category}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ThreeSixty;
