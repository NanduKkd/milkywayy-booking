import { InstagramEmbed } from 'react-social-media-embed';

const InstaReel = ({sizes, url} = {sizes: {md: 200, lg: 400}}) => Object.keys(sizes).map((size, ii) => (
  <div className={`hidden ${size}:block`} key={size}>
    <InstagramEmbed url={url} width={sizes[size]} />
  </div>
))

export default InstaReel;
