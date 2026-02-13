import {useUserInitialization} from '@hooks/useUserInitialization';

import Canvas from './Canvas';

const CollaborativeCanvas = () => {
  useUserInitialization();

  return <Canvas />;
};

export default CollaborativeCanvas;
