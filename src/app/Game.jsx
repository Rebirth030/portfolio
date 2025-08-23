import { useRef } from 'react';
import Environment from '../environment/Environment.jsx';
import Player from '../player/Player.jsx';
import Postprocessing from './Postprocessing.jsx';

export default function Game() {
  const playerRef = useRef();
  return (
    <>
      <Environment playerRef={playerRef} />
      <Player ref={playerRef} />
      <Postprocessing />
    </>
  );
}
