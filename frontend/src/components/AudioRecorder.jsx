import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useToast } from '../hooks/use-toast';
import { FaMicrophone, FaStop, FaPlay, FaPause, FaTrash, FaSpinner, FaCheckCircle, FaUpload, FaRedo, FaClock } from 'react-icons/fa';

/**
 * Audio Recorder Component
 * Records audio directly in the browser with enhanced UI
 * 
 * @param {Function} onRecordComplete - Callback when recording is complete (receives blob)
 * @param {Function} onUpload - Callback to upload the recorded audio
 * @param {boolean} disabled - Whether recording is disabled
 * @param {string} language - Language code ('en' or 'kh')
 */
export default function AudioRecorder({ onRecordComplete, onUpload, disabled = false, language = 'en' }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const { toast } = useToast();

  // Check if browser supports MediaRecorder
  const isSupported = typeof MediaRecorder !== 'undefined';

  useEffect(() => {
    return () => {
      // Cleanup
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setHasRecorded(true);
        if (onRecordComplete) {
          onRecordComplete(blob);
        }
        
        // Get audio duration
        const tempAudio = new Audio(url);
        tempAudio.onloadedmetadata = () => {
          setAudioDuration(tempAudio.duration);
        };
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };
      
      streamRef.current = stream;

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        variant: "destructive",
        title: "Microphone Error",
        description: "Failed to start recording. Please allow microphone access.",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Update current time during playback
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      const updateTime = () => setCurrentTime(audio.currentTime);
      audio.addEventListener('timeupdate', updateTime);
      return () => audio.removeEventListener('timeupdate', updateTime);
    }
  }, [audioUrl]);

  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      setAudioBlob(null);
      setIsPlaying(false);
      setHasRecorded(false);
      setCurrentTime(0);
      setAudioDuration(0);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  };

  const resetRecording = () => {
    deleteRecording();
    setRecordingTime(0);
  };

  const handleUpload = async () => {
    if (!audioBlob || !onUpload) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    try {
      // Convert webm to blob for upload
      const file = new File([audioBlob], `recording_${language}_${Date.now()}.webm`, {
        type: 'audio/webm'
      });
      
      // Simulate progress (since we can't track actual upload progress with current API)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);
      
      await onUpload(file);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 1000);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload Error",
        description: "Failed to upload audio recording.",
      });
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isSupported) {
    return (
      <div className="p-3 rounded-lg border border-destructive/50 bg-destructive/10">
        <p className="text-sm text-destructive">
          Audio recording is not supported in your browser
        </p>
      </div>
    );
  }

  const progressPercentage = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="space-y-3 w-full">
      {/* Recording Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:flex-wrap">
        {!isRecording && !audioBlob && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 shadow-sm w-full sm:w-auto min-h-[44px] touch-manipulation"
          >
            <FaMicrophone className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">Start Recording</span>
          </Button>
        )}

        {isRecording && (
          <div className="flex items-center gap-2 flex-wrap w-full">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="h-2 w-2 rounded-full bg-destructive animate-pulse"></div>
              <span className="text-sm font-medium text-destructive">Recording</span>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={stopRecording}
              className="flex items-center gap-2"
            >
              <FaStop className="h-4 w-4" />
              <span>Stop</span>
            </Button>
            {!isPaused ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={pauseRecording}
                className="flex items-center gap-2"
              >
                <FaPause className="h-4 w-4" />
                <span>Pause</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resumeRecording}
                className="flex items-center gap-2"
              >
                <FaPlay className="h-4 w-4" />
                <span>Resume</span>
              </Button>
            )}
            <Badge variant="outline" className="font-mono text-sm px-2 py-1 bg-background">
              <FaClock className="h-3 w-3 mr-1" />
              {formatTime(recordingTime)}
            </Badge>
          </div>
        )}

        {audioBlob && !isRecording && (
          <div className="w-full space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
              <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 w-full sm:w-auto">
                <FaCheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Recording Complete</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                {audioBlob && (
                  <Badge variant="outline" className="text-xs flex-1 sm:flex-initial justify-center min-h-[36px]">
                    {formatFileSize(audioBlob.size)}
                  </Badge>
                )}
                {audioDuration > 0 && (
                  <Badge variant="outline" className="text-xs font-mono flex-1 sm:flex-initial justify-center min-h-[36px]">
                    {formatTime(audioDuration)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Audio Player Progress */}
            {audioDuration > 0 && (
              <div className="space-y-1.5 px-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(audioDuration)}</span>
                </div>
                <Progress value={progressPercentage} className="h-2 w-full" />
              </div>
            )}

            {/* Control Buttons - Mobile Grid Layout */}
            <div className="grid grid-cols-2 sm:flex sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={playRecording}
                className="flex items-center justify-center gap-2 min-h-[44px] touch-manipulation"
              >
                {isPlaying ? (
                  <>
                    <FaPause className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">Pause</span>
                  </>
                ) : (
                  <>
                    <FaPlay className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">Play</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleUpload}
                disabled={isUploading || disabled}
                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 min-h-[44px] touch-manipulation col-span-2 sm:col-span-1"
              >
                {isUploading ? (
                  <>
                    <FaSpinner className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    <span className="text-sm sm:text-base">Uploading...</span>
                  </>
                ) : (
                  <>
                    <FaUpload className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">Upload</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetRecording}
                className="flex items-center justify-center gap-2 min-h-[44px] touch-manipulation"
              >
                <FaRedo className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-sm sm:text-base hidden sm:inline">Record Again</span>
                <span className="text-sm sm:text-base sm:hidden">Again</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={deleteRecording}
                className="flex items-center justify-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[44px] touch-manipulation"
              >
                <FaTrash className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-sm sm:text-base">Delete</span>
              </Button>
            </div>

            {/* Upload Progress */}
            {isUploading && uploadProgress > 0 && (
              <div className="space-y-1.5 px-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2 w-full" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Audio Player (hidden) */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setAudioDuration(audioRef.current.duration);
            }
          }}
          className="hidden"
        />
      )}

      {/* Help Text */}
      {!audioBlob && !isRecording && (
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed px-1">
          Click "Start Recording" to record audio. Make sure your microphone is enabled.
        </p>
      )}
    </div>
  );
}
