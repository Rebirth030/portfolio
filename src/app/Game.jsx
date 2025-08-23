import Environment from '../environment/Environment.jsx';
import Player from '../player/Player.jsx';
import Postprocessing from './Postprocessing.jsx';

export default function Game() {
  return (
    <>
      <Environment />
      <Player />
      <Postprocessing />
    </>
  );
}
