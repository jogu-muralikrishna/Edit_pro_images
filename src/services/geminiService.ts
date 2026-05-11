/**
 * AI Services using server-side API Proxy.
 * This makes the app production-ready and protects API keys.
 */
 
 /**
  * Optimizes an image for Gemini by resizing it if it's too large.
  */
 const optimizeImage = async (dataUrl: string, maxDim = 1024): Promise<string> => {
   return new Promise((resolve) => {
     const img = new Image();
     img.crossOrigin = 'anonymous';
     img.onload = () => {
       const canvas = document.createElement('canvas');
       let { width, height } = img;
       
       if (width > maxDim || height > maxDim) {
         if (width > height) {
           height = (height / width) * maxDim;
           width = maxDim;
         } else {
           width = (width / height) * maxDim;
           height = maxDim;
         }
       }
       
       canvas.width = width;
       canvas.height = height;
       const ctx = canvas.getContext('2d');
       ctx?.drawImage(img, 0, 0, width, height);
       resolve(canvas.toDataURL('image/png', 0.8));
     };
     img.onerror = () => resolve(dataUrl);
     img.src = dataUrl;
   });
 };
 
  /**
  * Enhances a simple prompt into a detailed artistic description.
  */
 export const enhancePrompt = async (prompt: string): Promise<string> => {
   try {
     const response = await fetch('/api/ai/enhance-prompt', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ prompt })
     });
     
     if (!response.ok) throw new Error('Failed to enhance prompt');
     
     const data = await response.json();
     return data.prompt || prompt;
   } catch (error) {
     console.error("Prompt Enhancement Error:", error);
     return prompt;
   }
 };
 
 export const generateAIImage = async (prompt: string) => {
   try {
     const response = await fetch('/api/ai/generate', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ prompt })
     });
     
     if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.error || 'AI Generation Failed');
     }
     
     const data = await response.json();
     if (data.image) return data.image;
     if (data.text) throw new Error(data.text);
 
     throw new Error("No image data returned from AI.");
   } catch (error: any) {
     console.error("AI Generation Error:", error);
     // Fallback to Unsplash for better UX if AI fails
     return `https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=1000&q=80&sig=${Math.random()}&q=${encodeURIComponent(prompt)}`;
   }
 };
 
 export const editImageWithAI = async (imageData: string, prompt: string) => {
   try {
     // Optimize image before sending
     const optimizedImage = await optimizeImage(imageData);
 
     const response = await fetch('/api/ai/edit', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ image: optimizedImage, prompt })
     });
 
     if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.error || 'AI Editing Failed');
     }
 
     const data = await response.json();
     if (data.image) return data.image;
     
     return data.text || "No edited image returned";
   } catch (error) {
     console.error("AI Edit Error:", error);
     throw error;
   }
 };
 
 /**
  * Specialized background removal using AI.
  */
 export const removeBackground = async (imageData: string): Promise<string> => {
   try {
     const optimizedImage = await optimizeImage(imageData);
 
     const response = await fetch('/api/remove-bg', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ image: optimizedImage })
     });
 
     if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.error || 'Background removal failed');
     }
 
     const data = await response.json();
     if (data.image) return data.image;
     
     throw new Error("Failed to process background removal");
   } catch (error) {
     console.error("Remove BG Error:", error);
     throw error;
   }
 };
 
 /**
  * Gets creative suggestions for the current design.
  */
 export const getEditingSuggestions = async (imageData: string): Promise<string[]> => {
   try {
     const optimizedImage = await optimizeImage(imageData, 512);
 
     const response = await fetch('/api/ai/suggestions', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ image: optimizedImage })
     });
     
     if (!response.ok) return [];
 
     const data = await response.json();
     return data.suggestions || [];
   } catch (error) {
     console.error("Editing Suggestions Error:", error);
     return [];
   }
 };

