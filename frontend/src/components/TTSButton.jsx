import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { FaVolumeUp, FaSpinner, FaStop } from 'react-icons/fa';
import api from '../lib/api';

/**
 * TTS Button Component
 * Plays voice-over audio from Cloudinary if available, otherwise uses TTS
 * 
 * @param {string} text - Text to speak (used as fallback if audioUrl not provided)
 * @param {string} audioUrl - Cloudinary audio URL (optional, preferred over TTS)
 * @param {string} languageCode - Language code ('en-US' or 'km-KH')
 * @param {string} className - Additional CSS classes
 */
export default function TTSButton({ text, audioUrl = null, languageCode = 'en-US', className = '', size = 'sm' }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(null);

  const handlePlay = async () => {
    // If already playing, stop it
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    let audioUrlToPlay = null; // Declare outside try block for cleanup in catch

    try {
      setIsLoading(true);
      setIsPlaying(true);

      // Priority 1: Use stored voice-over audio from Cloudinary if available
      if (audioUrl) {
        audioUrlToPlay = audioUrl;
      } 
      // Priority 2: Fallback to TTS if no audio URL and text is available
      else if (text && text.trim().length > 0) {
        // Always use en-US for all languages (it supports all languages including Khmer)
        const langCode = 'en-US';

        // Call TTS API
        const response = await api.post(
          '/tts/speak',
          { text, languageCode: langCode },
          { 
            responseType: 'blob', // Important: expect binary audio data
            timeout: 30000 // 30 second timeout
          }
        );

        if (!response.data || response.data.size === 0) {
          throw new Error('Empty audio response from server');
        }

        // Create audio URL from blob
        audioUrlToPlay = URL.createObjectURL(response.data);
      } else {
        setIsLoading(false);
        setIsPlaying(false);
        alert('No text or audio URL provided');
        return;
      }

      // Create and play audio
      const audio = new Audio(audioUrlToPlay);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        // Only revoke if it's a blob URL (TTS), not Cloudinary URL
        if (audioUrlToPlay.startsWith('blob:')) {
          URL.revokeObjectURL(audioUrlToPlay);
        }
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
        if (audioUrlToPlay.startsWith('blob:')) {
          URL.revokeObjectURL(audioUrlToPlay);
        }
        console.error('Error playing audio');
      };

      await audio.play();
      setIsLoading(false);
    } catch (error) {
      console.error('TTS Error:', error);
      setIsPlaying(false);
      setIsLoading(false);
      
      // Show user-friendly error message
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate or play audio';
      alert(`Audio Error: ${errorMessage}`);
      
      // Clean up blob URL if it was created
      if (audioUrlToPlay && audioUrlToPlay.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrlToPlay);
      }
    }
  };

  if (!text || text.trim().length === 0) {
    return null;
  }

  const isLarge = size === 'lg';

  return (
    <Button
      type="button"
      variant={isLarge ? 'outline' : 'ghost'}
      size={isLarge ? 'default' : 'sm'}
      onClick={handlePlay}
      disabled={isLoading}
      className={
        isLarge
          ? `h-12 min-w-[7rem] gap-2 rounded-xl px-4 shrink-0 ${className}`
          : `h-8 w-8 p-0 ${className}`
      }
      title={isPlaying ? 'Stop' : 'Play audio'}
      aria-label={isPlaying ? 'Stop audio' : 'Listen to question'}
    >
      {isLoading ? (
        <FaSpinner className={isLarge ? 'h-5 w-5 animate-spin' : 'h-4 w-4 animate-spin'} />
      ) : isPlaying ? (
        <FaStop className={isLarge ? 'h-5 w-5' : 'h-4 w-4'} />
      ) : (
        <FaVolumeUp className={isLarge ? 'h-5 w-5' : 'h-4 w-4'} />
      )}
      {isLarge && (
        <span className="text-sm font-medium">
          {isPlaying
            ? languageCode === 'kh'
              ? 'បញ្ឈប់'
              : 'Stop'
            : languageCode === 'kh'
              ? 'ស្តាប់'
              : 'Listen'}
        </span>
      )}
    </Button>
  );
}
