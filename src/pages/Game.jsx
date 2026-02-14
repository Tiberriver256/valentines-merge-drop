import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Maximize, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

const GAME_ASSET_BASE = `${import.meta.env.BASE_URL}assets/game`;
const DROP_SOUND_FILES = [
  "drop-soft-01.m4a",
  "drop-soft-02.m4a",
  "drop-soft-03.m4a",
];
const DROP_SOUND_PATHS = DROP_SOUND_FILES.map(
  (file) => `${import.meta.env.BASE_URL}audio/drops/${file}`
);
const MUSIC_GAIN_SCALE = 0.35;
const SFX_GAIN_SCALE = 1.8;

function AudioMixerControls({
  musicVolume,
  sfxVolume,
  onMusicChange,
  onSfxChange,
}) {
  const [musicPercent, setMusicPercent] = useState(
    Math.round(musicVolume * 100)
  );
  const [sfxPercent, setSfxPercent] = useState(Math.round(sfxVolume * 100));

  return (
    <div className="mt-2 space-y-4">
      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-semibold">
          <span>Background Music</span>
          <span>{musicPercent}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={musicPercent}
          onChange={(e) => {
            const percent = Number(e.target.value);
            setMusicPercent(percent);
            onMusicChange(percent / 100);
          }}
          aria-label="Background music volume"
          className="w-full"
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>Muted</span>
          <span>Full</span>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-semibold">
          <span>Sound Effects</span>
          <span>{sfxPercent}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={sfxPercent}
          onChange={(e) => {
            const percent = Number(e.target.value);
            setSfxPercent(percent);
            onSfxChange(percent / 100);
          }}
          aria-label="Sound effects volume"
          className="w-full"
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>Muted</span>
          <span>Full</span>
        </div>
      </div>
    </div>
  );
}

// Shape sizes with your relationship photos - each level gets bigger!
const SHAPES = [
  {
    radius: 15,
    color: "#FF69B4",
    glow: "#FF69B440",
    image: `${GAME_ASSET_BASE}/couple-evening-selfie.jpg`,
  },
  {
    radius: 22,
    color: "#FFB6C1",
    glow: "#FFB6C140",
    image: `${GAME_ASSET_BASE}/costume-party-flags-photo.jpg`,
  },
  {
    radius: 30,
    color: "#FF1493",
    glow: "#FF149340",
    image: `${GAME_ASSET_BASE}/gingerbread-house-kiss.jpg`,
  },
  {
    radius: 40,
    color: "#C71585",
    glow: "#C7158540",
    image: `${GAME_ASSET_BASE}/young-couple-doorway-photo-1.jpg`,
  },
  {
    radius: 52,
    color: "#DB7093",
    glow: "#DB709340",
    image: `${GAME_ASSET_BASE}/m-go-blue-couple-photo.jpg`,
  },
  {
    radius: 66,
    color: "#FF6EB4",
    glow: "#FF6EB440",
    image: `${GAME_ASSET_BASE}/young-couple-striped-sweater.jpg`,
  },
  {
    radius: 82,
    color: "#DC143C",
    glow: "#DC143C40",
    image: `${GAME_ASSET_BASE}/friends-wheelbarrow-game.jpg`,
  },
  {
    radius: 100,
    color: "#B22222",
    glow: "#B2222240",
    image: `${GAME_ASSET_BASE}/bathroom-couple-selfie.jpg`,
  },
  {
    radius: 120,
    color: "#8B008B",
    glow: "#8B008B40",
    image: `${GAME_ASSET_BASE}/couple-autumn-park-portrait.jpg`,
  },
  {
    radius: 145,
    color: "#FF0000",
    glow: "#FF000040",
    image: `${GAME_ASSET_BASE}/couple-brick-wall-date-night.jpg`,
  },
];

const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const GRAVITY = 0.5;
const FRICTION = 0.95;
const BOUNCE = 0.1;
const DANGER_LINE = 100;

export default function Game() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      const saved = localStorage.getItem("mergeGameHighScore");
      return saved ? parseInt(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [gameOver, setGameOver] = useState(false);
  const [currentShape, setCurrentShape] = useState(0);
  const [nextShape, setNextShape] = useState(0);
  const [shapes, setShapes] = useState([]);
  const [canDrop, setCanDrop] = useState(true);
  const [mouseX, setMouseX] = useState(GAME_WIDTH / 2);
  const [mergeEffects, setMergeEffects] = useState([]);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [sfxVolume, setSfxVolume] = useState(0.3);
  const shapesRef = useRef([]);
  const gameLoopRef = useRef(null);
  const lastDropRef = useRef(0);
  const audioRef = useRef(null);
  const dropSoundsRef = useRef([]);
  const audioStartedRef = useRef(false);
  const mergeTimeoutsRef = useRef([]);
  const dropCooldownTimeoutRef = useRef(null);
  const scoreRef = useRef(0);
  const dangerLineStartRef = useRef(null);
  const { toast } = useToast();

  // Generate next shape (only first 4 types can spawn)
  const getRandomShape = () => Math.floor(Math.random() * 4);

  // Reset game
  const resetGame = useCallback(() => {
    mergeTimeoutsRef.current.forEach(clearTimeout);
    mergeTimeoutsRef.current = [];
    if (dropCooldownTimeoutRef.current) {
      clearTimeout(dropCooldownTimeoutRef.current);
      dropCooldownTimeoutRef.current = null;
    }
    shapesRef.current = [];
    scoreRef.current = 0;
    lastDropRef.current = 0;
    dangerLineStartRef.current = null;
    setShapes([]);
    setScore(0);
    setGameOver(false);
    setCurrentShape(getRandomShape());
    setNextShape(getRandomShape());
    setCanDrop(true);
    setMergeEffects([]);
  }, []);

  const playDropSound = useCallback(() => {
    if (sfxVolume <= 0 || dropSoundsRef.current.length === 0) return;
    const idx = Math.floor(Math.random() * dropSoundsRef.current.length);
    const sound = dropSoundsRef.current[idx].cloneNode();
    sound.volume = Math.min(1, sfxVolume * SFX_GAIN_SCALE);
    sound.play().catch(() => {});
  }, [sfxVolume]);

  // Drop shape
  const dropShape = useCallback(
    (x) => {
      if (!canDrop || gameOver) return;

      const now = Date.now();
      if (now - lastDropRef.current < 500) return;
      lastDropRef.current = now;

      const shape = SHAPES[currentShape];
      const clampedX = Math.max(
        shape.radius,
        Math.min(GAME_WIDTH - shape.radius, x)
      );

      const newShape = {
        id: Date.now() + Math.random(),
        x: clampedX,
        y: 50,
        vx: 0,
        vy: 0,
        level: currentShape,
        radius: shape.radius,
        color: shape.color,
        glow: shape.glow,
        locked: false,
      };

      shapesRef.current.push(newShape);
      playDropSound();
      setCurrentShape(nextShape);
      setNextShape(getRandomShape());
      setCanDrop(false);
      if (dropCooldownTimeoutRef.current) {
        clearTimeout(dropCooldownTimeoutRef.current);
      }
      dropCooldownTimeoutRef.current = setTimeout(() => {
        setCanDrop(true);
        dropCooldownTimeoutRef.current = null;
      }, 500);
    },
    [canDrop, currentShape, gameOver, nextShape, playDropSound]
  );

  // Check collision between two circles
  const checkCollision = (a, b) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < a.radius + b.radius;
  };

  // Resolve collision
  const resolveCollision = (a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const overlap = a.radius + b.radius - dist;
    if (overlap <= 0) return;

    const nx = dx / dist;
    const ny = dy / dist;

    // Keep locked overlaps from persisting forever.
    if (a.locked && b.locked) {
      const half = overlap / 2;
      a.x -= half * nx;
      a.y -= half * ny;
      b.x += half * nx;
      b.y += half * ny;
      return;
    }

    // Separate shapes proportionally to inverse mass (locked shapes behave like infinite mass)
    const invMassA = a.locked ? 0 : 1;
    const invMassB = b.locked ? 0 : 1;
    const totalInvMass = invMassA + invMassB;
    if (totalInvMass === 0) return;

    const correction = overlap / totalInvMass;
    if (!a.locked) {
      a.x -= correction * invMassA * nx;
      a.y -= correction * invMassA * ny;
    }
    if (!b.locked) {
      b.x += correction * invMassB * nx;
      b.y += correction * invMassB * ny;
    }

    // Calculate relative velocity
    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const normalVelocity = rvx * nx + rvy * ny;

    // No impulse if already separating along the collision normal
    if (normalVelocity > 0) return;

    // Apply impulse - locked shapes don't get velocity
    const restitution = BOUNCE;
    const j = (-(1 + restitution) * normalVelocity) / totalInvMass;

    if (!a.locked) {
      a.vx -= j * invMassA * nx;
      a.vy -= j * invMassA * ny;
      a.vx *= 0.9;
      a.vy *= 0.9;
    }

    if (!b.locked) {
      b.vx += j * invMassB * nx;
      b.vy += j * invMassB * ny;
      b.vx *= 0.9;
      b.vy *= 0.9;
    }
  };

  // Game loop
  useEffect(() => {
    if (gameOver) return;

    const gameLoop = () => {
      const currentShapes = shapesRef.current;
      const toMerge = [];
      const merged = new Set();

      // Apply physics
      currentShapes.forEach((shape) => {
        // Skip physics for locked shapes
        if (!shape.locked) {
          shape.vy += GRAVITY;
          shape.vx *= FRICTION;
          shape.vy *= FRICTION;
          shape.x += shape.vx;
          shape.y += shape.vy;
        }

        // Apply boundary constraints to ALL shapes (even locked)
        if (shape.x - shape.radius < 0) {
          shape.x = shape.radius;
          shape.vx = 0;
        }
        if (shape.x + shape.radius > GAME_WIDTH) {
          shape.x = GAME_WIDTH - shape.radius;
          shape.vx = 0;
        }

        // Floor collision
        if (shape.y + shape.radius >= GAME_HEIGHT) {
          shape.y = GAME_HEIGHT - shape.radius;
          shape.vy = 0;
          if (!shape.locked) shape.vx *= 0.8;
        }
      });

      // Check collisions - multiple passes for better stability
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < currentShapes.length; i++) {
          for (let j = i + 1; j < currentShapes.length; j++) {
            const a = currentShapes[i];
            const b = currentShapes[j];

            if (checkCollision(a, b)) {
              if (
                pass === 0 &&
                a.level === b.level &&
                a.level < SHAPES.length - 1 &&
                !merged.has(a.id) &&
                !merged.has(b.id)
              ) {
                toMerge.push([i, j]);
                merged.add(a.id);
                merged.add(b.id);
              } else {
                resolveCollision(a, b);
              }
            }
          }
        }
      }

      // Lock settled shapes after collision resolution
      currentShapes.forEach((shape) => {
        if (
          !shape.locked &&
          Math.abs(shape.vx) < 0.15 &&
          Math.abs(shape.vy) < 0.15
        ) {
          // Check if shape is resting on something
          const isOnGround = shape.y + shape.radius >= GAME_HEIGHT - 1;
          const isOnShape = currentShapes.some((other) => {
            if (other.id === shape.id) return false;
            const dx = shape.x - other.x;
            const dy = shape.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return false;

            const touching = dist < shape.radius + other.radius + 2;
            const supportFromBelow = dy < 0 && -dy / dist > 0.6;
            const otherIsStable =
              other.locked ||
              (Math.abs(other.vx) < 0.15 && Math.abs(other.vy) < 0.15);

            return touching && supportFromBelow && otherIsStable;
          });

          if (isOnGround || isOnShape) {
            shape.locked = true;
          }
        }
      });

      let shapesForChecks = currentShapes;

      // Process merges
      if (toMerge.length > 0) {
        const indicesToRemove = new Set();
        const newShapes = [];
        const newEffects = [];

        toMerge.forEach(([i, j]) => {
          const a = currentShapes[i];
          const b = currentShapes[j];
          const newLevel = a.level + 1;
          const newConfig = SHAPES[newLevel];

          newShapes.push({
            id: Date.now() + Math.random(),
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
            vx: 0,
            vy: -1,
            level: newLevel,
            radius: newConfig.radius,
            color: newConfig.color,
            glow: newConfig.glow,
            locked: false,
          });

          newEffects.push({
            id: Date.now() + Math.random(),
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
            color: newConfig.color,
          });

          indicesToRemove.add(i);
          indicesToRemove.add(j);

          setScore((prev) => {
            const newScore = prev + (newLevel + 1) * 10;
            scoreRef.current = newScore;
            return newScore;
          });
        });

        shapesForChecks = [
          ...currentShapes.filter((_, i) => !indicesToRemove.has(i)),
          ...newShapes,
        ];
        shapesRef.current = shapesForChecks;

        setMergeEffects((prev) => [...prev, ...newEffects]);
        const timeoutId = setTimeout(() => {
          setMergeEffects((prev) =>
            prev.filter((e) => !newEffects.find((ne) => ne.id === e.id))
          );
        }, 500);
        mergeTimeoutsRef.current.push(timeoutId);
      }

      // Check game over when the stack breaches the danger line.
      // Ignore newly dropped pieces near the top by requiring center >= line.
      const dangerShapes = shapesForChecks.filter(
        (s) => s.y - s.radius < DANGER_LINE && s.y >= DANGER_LINE
      );

      if (dangerShapes.length >= 1) {
        if (dangerLineStartRef.current === null) {
          dangerLineStartRef.current = performance.now();
        }
      } else {
        dangerLineStartRef.current = null;
      }

      const settledDangerShapes = dangerShapes.filter(
        (s) => s.locked || (Math.abs(s.vy) < 0.5 && Math.abs(s.vx) < 0.5)
      );
      const lineViolatedTooLong =
        dangerLineStartRef.current !== null &&
        performance.now() - dangerLineStartRef.current > 1200;

      if (settledDangerShapes.length >= 1 || lineViolatedTooLong) {
        setGameOver(true);
        const finalScore = scoreRef.current;
        setHighScore((prev) => {
          const newHigh = Math.max(prev, finalScore);
          try {
            localStorage.setItem("mergeGameHighScore", newHigh.toString());
          } catch {
            // localStorage unavailable
          }
          return newHigh;
        });
      }

      setShapes([...shapesForChecks]);
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (dropCooldownTimeoutRef.current) {
        clearTimeout(dropCooldownTimeoutRef.current);
        dropCooldownTimeoutRef.current = null;
      }
      mergeTimeoutsRef.current.forEach(clearTimeout);
      mergeTimeoutsRef.current = [];
    };
  }, [gameOver]);

  // Initialize
  useEffect(() => {
    // Set page title and favicon
    document.title = "💕 Love Merge Game";
    const favicon =
      document.querySelector("link[rel*='icon']") ||
      document.createElement("link");
    favicon.type = "image/x-icon";
    favicon.rel = "shortcut icon";
    favicon.href =
      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💕</text></svg>';
    document.getElementsByTagName("head")[0].appendChild(favicon);

    setCurrentShape(getRandomShape());
    setNextShape(getRandomShape());

    // Setup audio (will play on first user interaction)
    audioRef.current = new Audio(`${GAME_ASSET_BASE}/background-music.mp3`);
    audioRef.current.loop = true;
    audioRef.current.volume = musicVolume;
    dropSoundsRef.current = DROP_SOUND_PATHS.map((src) => {
      const sound = new Audio(src);
      sound.preload = "auto";
      return sound;
    });

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      dropSoundsRef.current.forEach((sound) => {
        sound.pause();
        sound.src = "";
      });
      dropSoundsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = musicVolume * MUSIC_GAIN_SCALE;
    if (musicVolume <= 0) {
      audioRef.current.pause();
      return;
    }
    if (audioStartedRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [musicVolume]);

  // Start audio on first interaction
  const startAudio = () => {
    if (!audioStartedRef.current && audioRef.current) {
      audioRef.current.play().catch(() => {});
      audioStartedRef.current = true;
    }
  };

  // Enter fullscreen
  const enterFullscreen = async () => {
    startAudio();
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        await elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
    } catch (err) {
      console.log("Fullscreen not supported or denied");
    }
    setShowFullscreenPrompt(false);
  };

  // Open volume controls
  const openVolumeControls = () => {
    toast({
      title: "Audio Mix",
      description: (
        <AudioMixerControls
          musicVolume={musicVolume}
          sfxVolume={sfxVolume}
          onMusicChange={setMusicVolume}
          onSfxChange={setSfxVolume}
        />
      ),
    });
  };

  // Handle mouse/touch
  const handleCanvasClick = (e) => {
    startAudio();
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    dropShape(x);
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    setMouseX(
      Math.max(
        SHAPES[currentShape]?.radius || 20,
        Math.min(GAME_WIDTH - (SHAPES[currentShape]?.radius || 20), x)
      )
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-900 via-rose-800 to-red-900 flex flex-col items-center justify-center p-4">
      {/* Fullscreen Prompt */}
      <AnimatePresence>
        {showFullscreenPrompt && !isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFullscreenPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-3xl p-8 max-w-sm text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-white mb-3">
                💕 Better Experience
              </h3>
              <p className="text-pink-100 mb-6">
                Play in fullscreen mode for the best experience!
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    startAudio();
                    setShowFullscreenPrompt(false);
                  }}
                  variant="outline"
                  className="flex-1 bg-white/20 border-white/30 text-white hover:bg-white/30"
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={enterFullscreen}
                  className="flex-1 bg-white text-pink-600 hover:bg-pink-50"
                >
                  <Maximize className="w-4 h-4 mr-2" />
                  Go Fullscreen
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="w-full max-w-md mb-4">
        <div className="flex justify-between items-center">
          <div className="text-white/80">
            <p className="text-xs uppercase tracking-widest">💕 Love Points</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-pink-200 to-rose-300 bg-clip-text text-transparent">
              {score.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={openVolumeControls}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              {musicVolume <= 0 && sfxVolume <= 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>
            <div className="text-white/60 text-right">
              <p className="text-xs uppercase tracking-widest">Best</p>
              <p className="text-xl font-semibold">
                {highScore.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Game Container */}
      <div className="relative">
        {/* Next Shape Preview */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
          <span className="text-white/60 text-sm">Next: ❤️</span>
          <div
            className="rounded-full shadow-lg border-2 border-pink-300"
            style={{
              width: SHAPES[nextShape]?.radius * 1.5 || 30,
              height: SHAPES[nextShape]?.radius * 1.5 || 30,
              backgroundImage: `url(${SHAPES[nextShape]?.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              boxShadow: `0 0 20px ${SHAPES[nextShape]?.glow}`,
            }}
          />
        </div>

        {/* Game Canvas */}
        <div
          ref={canvasRef}
          className="relative bg-gradient-to-b from-pink-800/30 to-rose-900/50 rounded-3xl overflow-hidden cursor-crosshair backdrop-blur-sm border-4 border-pink-300/30 max-w-full"
          style={{
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
            aspectRatio: `${GAME_WIDTH}/${GAME_HEIGHT}`,
            touchAction: "none",
          }}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onTouchMove={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            if (!touch || !canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const scaleX = GAME_WIDTH / rect.width;
            const x = (touch.clientX - rect.left) * scaleX;
            setMouseX(
              Math.max(
                SHAPES[currentShape]?.radius || 20,
                Math.min(GAME_WIDTH - (SHAPES[currentShape]?.radius || 20), x)
              )
            );
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            startAudio();
            const touch = e.changedTouches?.[0];
            if (!touch || !canvasRef.current) {
              dropShape(mouseX);
              return;
            }

            const rect = canvasRef.current.getBoundingClientRect();
            const scaleX = GAME_WIDTH / rect.width;
            const x = (touch.clientX - rect.left) * scaleX;
            dropShape(x);
          }}
        >
          {/* Danger Line */}
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-rose-400/40"
            style={{ top: DANGER_LINE }}
          />
          <div
            className="absolute left-0 right-0 bg-gradient-to-b from-rose-500/15 to-transparent"
            style={{ top: 0, height: DANGER_LINE }}
          />

          {/* Drop Preview */}
          {canDrop && !gameOver && (
            <>
              <div
                className="absolute top-12 rounded-full opacity-70 transition-all duration-75 border-2 border-pink-300/50"
                style={{
                  left: mouseX - (SHAPES[currentShape]?.radius || 20),
                  width: (SHAPES[currentShape]?.radius || 20) * 2,
                  height: (SHAPES[currentShape]?.radius || 20) * 2,
                  backgroundImage: `url(${SHAPES[currentShape]?.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  boxShadow: `0 0 30px ${SHAPES[currentShape]?.glow}`,
                }}
              />
              <div
                className="absolute opacity-20"
                style={{
                  left: mouseX - 1,
                  top: 50 + (SHAPES[currentShape]?.radius || 20),
                  width: 2,
                  height:
                    GAME_HEIGHT - 50 - (SHAPES[currentShape]?.radius || 20),
                  background: `linear-gradient(to bottom, #FF69B4, transparent)`,
                }}
              />
            </>
          )}

          {/* Shapes */}
          {shapes.map((shape) => (
            <motion.div
              key={shape.id}
              className="absolute rounded-full border-2 border-pink-200/40"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                left: shape.x - shape.radius,
                top: shape.y - shape.radius,
                width: shape.radius * 2,
                height: shape.radius * 2,
                backgroundImage: `url(${SHAPES[shape.level]?.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                boxShadow: `0 4px 20px ${shape.glow}, inset 0 -2px 8px rgba(0,0,0,0.3)`,
              }}
            />
          ))}

          {/* Merge Effects */}
          <AnimatePresence>
            {mergeEffects.map((effect) => (
              <motion.div
                key={effect.id}
                className="absolute rounded-full pointer-events-none"
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  left: effect.x - 30,
                  top: effect.y - 30,
                  width: 60,
                  height: 60,
                  backgroundColor: effect.color,
                  filter: "blur(10px)",
                }}
              />
            ))}
          </AnimatePresence>

          {/* Game Over Overlay */}
          <AnimatePresence>
            {gameOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="text-center"
                >
                  <h2 className="text-4xl font-bold text-white mb-2">
                    Game Over! 💕
                  </h2>
                  <p className="text-6xl font-bold bg-gradient-to-r from-pink-200 to-rose-300 bg-clip-text text-transparent mb-6">
                    {score.toLocaleString()}
                  </p>
                  {score >= highScore && score > 0 && (
                    <p className="text-pink-300 mb-4 animate-pulse">
                      💖 New Record of Love!
                    </p>
                  )}
                  <Button
                    onClick={resetGame}
                    className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-8 py-6 rounded-2xl text-lg font-semibold shadow-lg shadow-pink-500/30"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Play Again ❤️
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-pink-200/60 text-sm mt-4 text-center">
        💕 Click or tap to drop memories • Match same photos to merge & grow
        your love story
      </p>

      {/* Shape Legend */}
      <div className="flex gap-1 mt-4 flex-wrap justify-center max-w-md">
        {SHAPES.slice(0, 6).map((shape, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full border border-pink-300/30"
            style={{
              backgroundImage: `url(${shape.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              boxShadow: `0 2px 8px ${shape.glow}`,
            }}
            title={`Level ${i + 1}`}
          />
        ))}
        <span className="text-pink-200/40 text-xs self-center ml-1">...💖</span>
      </div>
    </div>
  );
}



