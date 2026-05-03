'use client';

import { useEffect, useRef } from 'react';

interface LiquidEtherProps {
  className?: string;
}

export function LiquidEther({ className = '' }: LiquidEtherProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationId: number;
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Metaball/blob system for liquid ether effect
    class Blob {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;

      constructor(x: number, y: number, radius: number, color: string) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = radius;
        this.color = color;
      }

      update(width: number, height: number, mouseInfluence: number) {
        // Mouse attraction
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 300 && dist > 0) {
          this.vx += (dx / dist) * mouseInfluence * 0.01;
          this.vy += (dy / dist) * mouseInfluence * 0.01;
        }

        // Damping
        this.vx *= 0.98;
        this.vy *= 0.98;

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges with soft boundaries
        if (this.x < this.radius || this.x > width - this.radius) {
          this.vx *= -0.8;
          this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
        }
        if (this.y < this.radius || this.y > height - this.radius) {
          this.vy *= -0.8;
          this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));
        }
      }
    }

    // Create blobs
    const blobs: Blob[] = [];
    const blobCount = 12;
    const colors = [
      'rgba(100, 150, 255, 0.6)',
      'rgba(150, 100, 255, 0.6)',
      'rgba(100, 200, 255, 0.5)',
      'rgba(200, 100, 255, 0.5)',
    ];

    for (let i = 0; i < blobCount; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = 80 + Math.random() * 120;
      const color = colors[Math.floor(Math.random() * colors.length)];
      blobs.push(new Blob(x, y, radius, color));
    }

    let time = 0;

    const animate = () => {
      const { width, height } = canvas;

      // Smooth mouse movement
      mouseX += (targetMouseX - mouseX) * 0.1;
      mouseY += (targetMouseY - mouseY) * 0.1;

      // Dark gradient background
      const bgGradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height)
      );
      bgGradient.addColorStop(0, '#0a0a1a');
      bgGradient.addColorStop(0.5, '#1a0a2e');
      bgGradient.addColorStop(1, '#0a0a1a');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Update and draw blobs with metaball effect
      const mouseInfluence = Math.sin(time * 0.5) * 2 + 3;
      
      blobs.forEach((blob) => {
        blob.update(width, height, mouseInfluence);
      });

      // Draw blobs with glow
      ctx.globalCompositeOperation = 'lighter';
      
      blobs.forEach((blob) => {
        const gradient = ctx.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          blob.radius
        );
        
        gradient.addColorStop(0, blob.color);
        gradient.addColorStop(0.5, blob.color.replace(/[\d.]+\)$/g, '0.3)'));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fill();

        // Extra glow layer
        ctx.shadowBlur = 40;
        ctx.shadowColor = blob.color;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ctx.globalCompositeOperation = 'source-over';

      // Add ethereal particles
      for (let i = 0; i < 40; i++) {
        const angle = (i / 40) * Math.PI * 2 + time * 0.3;
        const radius = 150 + Math.sin(time * 0.5 + i) * 50;
        const x = width / 2 + Math.cos(angle) * radius;
        const y = height / 2 + Math.sin(angle) * radius;
        const size = 1 + Math.sin(time * 2 + i) * 0.5;
        const alpha = 0.3 + Math.sin(time + i) * 0.2;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150, 200, 255, ${alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(150, 200, 255, 0.8)';
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      time += 0.016;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 ${className}`}
    />
  );
}
