'use client';

import React, { useState, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { supabase } from '@/pages/_app';
import { Dialog } from '@headlessui/react';
import MediaPicker from './MediaPicker';

const TinyMCEWithScripts = ({ value, onChange, placeholder = 'Start writing your content here...' }) => {
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageSize, setImageSize] = useState('medium');
  const [imageWidth, setImageWidth] = useState('');
  const [imageHeight, setImageHeight] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [imageSpacing, setImageSpacing] = useState('normal');
  const [imageType, setImageType] = useState('inline');
  const [backgroundOverlay, setBackgroundOverlay] = useState('none');
  const [isEditing, setIsEditing] = useState(false);
  const [editingElement, setEditingElement] = useState(null);
  const [htmlContent, setHtmlContent] = useState('');
  const editorRef = useRef(null);

  // Load media files when modal opens
  const loadMediaFiles = async () => {
    try {
      const res = await fetch('/api/media/list');
      const result = await res.json();
      
      if (!res.ok) {
        console.error('Error loading media files:', result.error || 'Failed to fetch images');
        return;
      }

      if (result.files) {
        const filesWithUrls = await Promise.all(
          result.files.map(async (file) => {
            const urlRes = await fetch(`/api/media/signed-url?fileName=${encodeURIComponent(file.name)}`);
            const urlResult = await urlRes.json();
            
            return {
              name: file.name,
              url: urlResult.url || '',
              size: file.metadata?.size || 0,
              created_at: file.created_at
            };
          })
        );

        setMediaFiles(filesWithUrls);
      }
    } catch (error) {
      console.error('Error loading media files:', error);
    }
  };

  const handleEditorChange = (content) => {
    onChange(content);
  };

  const handleEditorInit = (evt, editor) => {
    editorRef.current = editor;
    
    // Add custom context menu for images
    editor.on('contextmenu', function(e) {
      const target = e.target;
      if (target.tagName === 'IMG' || target.classList.contains('bg-image-container') || target.closest('.bg-image-container')) {
        e.preventDefault();
        
        // Create custom context menu
        const menu = document.createElement('div');
        menu.className = 'custom-context-menu';
        menu.style.cssText = `
          position: fixed;
          background: white;
          border: 1px solid #ccc;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          z-index: 10000;
          padding: 4px 0;
        `;
        
        const editOption = document.createElement('div');
        editOption.textContent = 'Edit Image';
        editOption.style.cssText = `
          padding: 8px 16px;
          cursor: pointer;
          font-size: 14px;
        `;
        editOption.onmouseover = () => editOption.style.backgroundColor = '#f0f0f0';
        editOption.onmouseout = () => editOption.style.backgroundColor = 'transparent';
        editOption.onclick = () => {
          document.body.removeChild(menu);
          editExistingImage();
        };
        
        menu.appendChild(editOption);
        menu.style.left = e.pageX + 'px';
        menu.style.top = e.pageY + 'px';
        
        document.body.appendChild(menu);
        
        // Remove menu when clicking elsewhere
        const removeMenu = () => {
          if (document.body.contains(menu)) {
            document.body.removeChild(menu);
          }
          document.removeEventListener('click', removeMenu);
        };
        
        setTimeout(() => {
          document.addEventListener('click', removeMenu);
        }, 100);
      }
    });
  };

  const openMediaSelector = () => {
    loadMediaFiles();
    setShowMediaSelector(true);
  };

  const openHtmlEditor = () => {
    setHtmlContent(value);
    setShowHtmlEditor(true);
  };

  const saveHtmlContent = () => {
    onChange(htmlContent);
    setShowHtmlEditor(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadRes.json();
      
      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadResult.error || 'Unknown error'}`);
      }

      // Get the signed URL for the uploaded file
      const urlRes = await fetch(`/api/media/signed-url?fileName=${encodeURIComponent(file.name)}`);
      const urlResult = await urlRes.json();

      if (editorRef.current) {
        editorRef.current.insertContent(`<img src="${urlResult.url}" alt="${file.name}" />`);
      }

      setShowMediaSelector(false);
      event.target.value = ''; // Clear the input
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageSelect = (file) => {
    setSelectedImage(file);
    setImageAlt(file.name);
    setImageCaption('');
    setImageWidth('');
    setImageHeight('');
    setImageSize('medium');
    setImageSpacing('normal');
    setImageType('inline');
    setBackgroundOverlay('none');
  };

  const parseImageProperties = (element) => {
    // Parse existing image properties from the element
    const img = element.querySelector('img') || element;
    const src = img.src || img.getAttribute('src');
    const alt = img.alt || img.getAttribute('alt') || '';
    const width = img.width || img.getAttribute('width') || '';
    const height = img.height || img.getAttribute('height') || '';
    
    // Parse classes for size and spacing
    const classes = img.className || '';
    let size = 'medium';
    let spacing = 'normal';
    
    if (classes.includes('img-small')) size = 'small';
    else if (classes.includes('img-large')) size = 'large';
    else if (classes.includes('img-fluid')) size = 'fluid';
    
    if (classes.includes('img-spacing-tight')) spacing = 'tight';
    else if (classes.includes('img-spacing-wide')) spacing = 'wide';
    else if (classes.includes('img-spacing-left')) spacing = 'left';
    else if (classes.includes('img-spacing-right')) spacing = 'right';
    else if (classes.includes('img-spacing-center')) spacing = 'center';

    // Check if it's a background image
    const isBackground = element.classList.contains('bg-image-container');
    let overlay = 'none';
    if (isBackground) {
      if (element.classList.contains('bg-image-dark')) overlay = 'dark';
      else if (element.classList.contains('bg-image-light')) overlay = 'light';
    }

    // Find the image in our media files
    const mediaFile = mediaFiles.find(file => file.url === src);
    
    return {
      file: mediaFile,
      alt,
      width,
      height,
      size,
      spacing,
      type: isBackground ? 'background' : 'inline',
      overlay: isBackground ? overlay : 'none',
      caption: element.querySelector('figcaption')?.textContent || ''
    };
  };

  const editExistingImage = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const selectedNode = editor.selection.getNode();
    let elementToEdit = selectedNode;

    // Improved element detection for background images
    if (selectedNode.tagName === 'IMG') {
      elementToEdit = selectedNode;
    } else if (selectedNode.classList.contains('bg-image-container')) {
      elementToEdit = selectedNode;
    } else if (selectedNode.closest('.bg-image-container')) {
      elementToEdit = selectedNode.closest('.bg-image-container');
    } else if (selectedNode.closest('figure')) {
      elementToEdit = selectedNode.closest('figure');
    } else if (selectedNode.closest('div[style*="background-image"]')) {
      elementToEdit = selectedNode.closest('div[style*="background-image"]');
    }

    // Try to find background image containers in the selection
    if (!elementToEdit || elementToEdit === selectedNode) {
      const selection = editor.selection.getContent();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = selection;
      const bgContainer = tempDiv.querySelector('.bg-image-container');
      if (bgContainer) {
        elementToEdit = bgContainer;
      }
    }

    if (elementToEdit) {
      const props = parseImageProperties(elementToEdit);
      if (props.file) {
        setSelectedImage(props.file);
        setImageAlt(props.alt);
        setImageCaption(props.caption);
        setImageWidth(props.width);
        setImageHeight(props.height);
        setImageSize(props.size);
        setImageSpacing(props.spacing);
        setImageType(props.type);
        setBackgroundOverlay(props.overlay);
        setIsEditing(true);
        setEditingElement(elementToEdit);
        setShowMediaSelector(true);
      }
    }
  };

  const insertImageWithOptions = () => {
    if (!selectedImage || !editorRef.current) return;

    const editor = editorRef.current;

    if (isEditing && editingElement) {
      // Remove the existing element
      editor.dom.remove(editingElement);
    }

    if (imageType === 'background') {
      // Insert as background image with text overlay
      let bgDiv = `<div class="bg-image-container bg-image-${backgroundOverlay}" style="background-image: url('${selectedImage.url}'); min-height: 300px; background-size: cover; background-position: center; background-repeat: no-repeat; position: relative; display: flex; align-items: center; justify-content: center; margin: 1rem 0;">`;
      
      if (backgroundOverlay !== 'none') {
        bgDiv += `<div class="bg-overlay"></div>`;
      }
      
      bgDiv += `<div class="bg-content"><p>Your text content here. Click to edit.</p></div></div>`;
      
      editor.insertContent(bgDiv);
    } else {
      // Insert as regular image
      let imgTag = `<img src="${selectedImage.url}" alt="${imageAlt}"`;
      
      // Add size class
      if (imageSize !== 'medium') {
        imgTag += ` class="img-${imageSize}"`;
      }
      
      // Add spacing class
      if (imageSpacing !== 'normal') {
        imgTag += ` img-spacing-${imageSpacing}`;
      }
      
      // Add custom dimensions
      if (imageWidth) {
        imgTag += ` width="${imageWidth}"`;
      }
      if (imageHeight) {
        imgTag += ` height="${imageHeight}"`;
      }
      
      imgTag += ' />';
      
      // Add caption if provided
      if (imageCaption) {
        imgTag = `<figure>${imgTag}<figcaption>${imageCaption}</figcaption></figure>`;
      }
      
      editor.insertContent(imgTag);
    }
    
    setShowMediaSelector(false);
    setSelectedImage(null);
    setIsEditing(false);
    setEditingElement(null);
  };

  return (
    <div className="tinymce-container">
      <div className="mb-2 flex gap-2">
        <button
          type="button"
          onClick={openMediaSelector}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 flex items-center gap-2"
          title="Insert image from media library"
        >
          📁 Insert Image
        </button>
        <button
          type="button"
          onClick={editExistingImage}
          className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 flex items-center gap-2"
          title="Edit selected image"
        >
          ✏️ Edit Image
        </button>
        <button
          type="button"
          onClick={openHtmlEditor}
          className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600 flex items-center gap-2"
          title="Edit raw HTML"
        >
          🔧 Edit HTML
        </button>
      </div>

      <Editor
        apiKey="18tztnqswq20kqyq9iu16yqktdcjxsmtje1uax5lz5m0u0fb"
        value={value}
        onEditorChange={handleEditorChange}
        onInit={handleEditorInit}
        init={{
          height: 400,
          menubar: false,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
          ],
          toolbar: 'undo redo | blocks | ' +
            'bold italic forecolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'table tabledelete | tableprops tablerowprops tablecellprops | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol | ' +
            'removeformat | image | help',
          // Allow script tags and other HTML elements
          extended_valid_elements: 'script[src|type|async|defer|charset|language],iframe[src|frameborder|style|scrolling|class|width|height|name|align],object[class|id|width|height|data|type],param[name|value],embed[src|type|width|height|style|class],video[*],audio[*],source[*],track[*],canvas[*],svg[*],math[*],form[*],input[*],textarea[*],select[*],option[*],button[*],label[*],fieldset[*],legend[*],datalist[*],optgroup[*],output[*],progress[*],meter[*]',
          // Allow all valid elements and attributes
          valid_elements: '*[*]',
          // Allow all valid children
          valid_children: '+body[script],+body[style],+body[iframe],+body[object],+body[embed],+body[form]',
          // Don't strip any elements
          verify_html: false,
          // Allow custom CSS
          custom_elements: 'script,iframe,object,embed,video,audio,canvas,svg,math,form,input,textarea,select,button,label,fieldset,legend,datalist,optgroup,output,progress,meter',
          // Allow all protocols
          allow_script_urls: true,
          // Allow all HTML
          allow_html_in_named_anchor: true,
          // Don't convert URLs
          convert_urls: false,
          // Don't remove empty elements
          remove_empty_elements: false,
          // Don't remove redundant BR elements
          remove_redundant_brs: false,
          // Don't remove line breaks
          remove_linebreaks: false,
          // Don't remove whitespace
          remove_trailing_brs: false,
          // Don't remove empty spans
          remove_empty_containers: false,
          content_style: `
            body { 
              font-family: Helvetica, Arial, sans-serif; 
              font-size: 14px; 
              line-height: 1.6;
            }
            
            /* Table Styles */
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1rem 0;
            }
            
            table td, table th {
              border: 1px solid #ddd;
              padding: 8px 12px;
              text-align: left;
            }
            
            table th {
              background-color: #f8f9fa;
              font-weight: bold;
            }
            
            table tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            
            table tr:hover {
              background-color: #f5f5f5;
            }
            
            /* Background Image Styles */
            .bg-image-container {
              position: relative;
              overflow: hidden;
              border-radius: 8px;
              cursor: pointer;
            }
            
            .bg-image-container:hover {
              outline: 2px solid #3b82f6;
            }
            
            .bg-image-container .bg-overlay {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              z-index: 1;
            }
            
            .bg-image-container .bg-content {
              position: relative;
              z-index: 2;
              color: white;
              text-align: center;
              padding: 2rem;
              max-width: 80%;
            }
            
            .bg-image-dark .bg-overlay {
              background-color: rgba(0, 0, 0, 0.6);
            }
            
            .bg-image-light .bg-overlay {
              background-color: rgba(255, 255, 255, 0.3);
            }
            
            .bg-image-light .bg-content {
              color: #333;
            }
            
            /* Image Spacing Classes */
            .img-spacing-tight {
              margin: 0.25rem 0;
            }
            
            .img-spacing-normal {
              margin: 1rem 0;
            }
            
            .img-spacing-wide {
              margin: 2rem 0;
            }
            
            .img-spacing-left {
              margin: 1rem 1rem 1rem 0;
              float: left;
            }
            
            .img-spacing-right {
              margin: 1rem 0 1rem 1rem;
              float: right;
            }
            
            .img-spacing-center {
              margin: 1rem auto;
              display: block;
            }
            
            /* Image Size Classes */
            .img-small {
              max-width: 200px;
              height: auto;
            }
            
            .img-medium {
              max-width: 400px;
              height: auto;
            }
            
            .img-large {
              max-width: 600px;
              height: auto;
            }
            
            .img-fluid {
              max-width: 100%;
              height: auto;
            }
            
            /* Figure and Caption Styles */
            figure {
              margin: 1rem 0;
              text-align: center;
            }
            
            figcaption {
              margin-top: 0.5rem;
              font-style: italic;
              color: #666;
              font-size: 0.9em;
            }
            
            /* Clear floats */
            .clearfix::after {
              content: "";
              clear: both;
              display: table;
            }
          `,
          placeholder: placeholder,
          image_advtab: true,
          image_dimensions: true,
          image_class_list: [
            {title: 'Responsive', value: 'img-fluid'},
            {title: 'Small', value: 'img-small'},
            {title: 'Medium', value: 'img-medium'},
            {title: 'Large', value: 'img-large'}
          ],
          image_caption: true,
          image_title: true,
          automatic_uploads: true,
          file_picker_types: 'image',
          image_prepend_url: '',
          image_uploadtab: true,
          table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
          table_default_styles: {
            width: '100%'
          },
          table_default_attributes: {
            border: '1'
          },
          table_class_list: [
            {title: 'Default', value: ''},
            {title: 'Striped', value: 'table-striped'},
            {title: 'Bordered', value: 'table-bordered'},
            {title: 'Hover', value: 'table-hover'}
          ],
          image_tab_callback: function(callback, value, meta) {
            if (meta.filetype === 'image') {
              openMediaSelector();
            }
          },
          images_upload_handler: async (blobInfo, progress) => {
            try {
              const file = blobInfo.blob();
              const fileExt = file.name.split('.').pop();
              const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

              const { error: uploadError } = await supabase
                .storage
                .from('page-images')
                .upload(fileName, file, {
                  contentType: file.type,
                  upsert: true
                });

              if (uploadError) {
                throw new Error(`Upload failed: ${uploadError.message}`);
              }

              const { data: urlData } = await supabase
                .storage
                .from('page-images')
                .createSignedUrl(fileName, 3600 * 24 * 365);

              return urlData?.signedUrl || '';
            } catch (error) {
              console.error('Upload error:', error);
              throw error;
            }
          }
        }}
      />

      {/* HTML Editor Modal */}
      <Dialog
        open={showHtmlEditor}
        onClose={() => setShowHtmlEditor(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <Dialog.Title className="text-lg font-medium mb-4">
                Edit Raw HTML
              </Dialog.Title>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Edit the raw HTML content. Be careful with syntax - invalid HTML may break the editor.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Script tags and other HTML elements are now allowed. 
                    Be cautious when adding scripts as they can affect page security and performance.
                  </p>
                </div>
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="w-full h-96 p-4 border rounded-md font-mono text-sm"
                  placeholder="Enter HTML content here... (Script tags are now supported)"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowHtmlEditor(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveHtmlContent}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Save HTML
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Media Selector Modal */}
      <Dialog
        open={showMediaSelector}
        onClose={() => setShowMediaSelector(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-6xl w-full bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <Dialog.Title className="text-lg font-medium mb-4">
                {isEditing ? 'Edit Image' : 'Select or Upload Image'}
              </Dialog.Title>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left side - Upload and Gallery */}
                <div>
                  {/* Upload Section */}
                  <div className="mb-6 p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Upload New Image</h3>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {isUploading && <p className="mt-2 text-sm text-gray-600">Uploading...</p>}
                  </div>
                  
                  {/* Media Gallery */}
                  <div className="mb-4">
                    <h3 className="font-medium mb-2">Select from Gallery</h3>
                    <div className="grid grid-cols-3 gap-4 max-h-64 overflow-y-auto">
                      {mediaFiles.map((file) => (
                        <div
                          key={file.name}
                          className={`relative group cursor-pointer border rounded-lg overflow-hidden hover:border-blue-500 ${
                            selectedImage?.name === file.name ? 'border-blue-500 bg-blue-50' : ''
                          }`}
                          onClick={() => handleImageSelect(file)}
                        >
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-24 object-cover"
                            onError={(e) => {
                              e.target.src = '/placeholder-image.png';
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                              Select
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right side - Image Options */}
                {selectedImage && (
                  <div className="border-l pl-6">
                    <h3 className="font-medium mb-4">Image Options</h3>
                    
                    {/* Preview */}
                    <div className="mb-4">
                      <img
                        src={selectedImage.url}
                        alt={selectedImage.name}
                        className="w-full max-h-48 object-contain border rounded"
                      />
                    </div>

                    {/* Image Type Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">Image Type</label>
                      <select
                        value={imageType}
                        onChange={(e) => setImageType(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="inline">Regular Image</option>
                        <option value="background">Background Image (with text overlay)</option>
                      </select>
                    </div>

                    {imageType === 'background' && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Overlay Style</label>
                        <select
                          value={backgroundOverlay}
                          onChange={(e) => setBackgroundOverlay(e.target.value)}
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="none">No overlay</option>
                          <option value="dark">Dark overlay (white text)</option>
                          <option value="light">Light overlay (dark text)</option>
                        </select>
                      </div>
                    )}

                    {imageType === 'inline' && (
                      <>
                        {/* Size Options */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-2">Size</label>
                          <select
                            value={imageSize}
                            onChange={(e) => setImageSize(e.target.value)}
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                            <option value="fluid">Responsive</option>
                          </select>
                        </div>

                        {/* Spacing Options */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-2">Spacing & Alignment</label>
                          <select
                            value={imageSpacing}
                            onChange={(e) => setImageSpacing(e.target.value)}
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="normal">Normal (centered)</option>
                            <option value="tight">Tight spacing</option>
                            <option value="wide">Wide spacing</option>
                            <option value="left">Float left</option>
                            <option value="right">Float right</option>
                            <option value="center">Center aligned</option>
                          </select>
                        </div>

                        {/* Custom Dimensions */}
                        <div className="mb-4 grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm font-medium mb-1">Width (px)</label>
                            <input
                              type="number"
                              value={imageWidth}
                              onChange={(e) => setImageWidth(e.target.value)}
                              placeholder="Auto"
                              className="w-full p-2 border rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Height (px)</label>
                            <input
                              type="number"
                              value={imageHeight}
                              onChange={(e) => setImageHeight(e.target.value)}
                              placeholder="Auto"
                              className="w-full p-2 border rounded-md"
                            />
                          </div>
                        </div>

                        {/* Alt Text */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-2">Alt Text</label>
                          <input
                            type="text"
                            value={imageAlt}
                            onChange={(e) => setImageAlt(e.target.value)}
                            placeholder="Description for accessibility"
                            className="w-full p-2 border rounded-md"
                          />
                        </div>

                        {/* Caption */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-2">Caption (optional)</label>
                          <input
                            type="text"
                            value={imageCaption}
                            onChange={(e) => setImageCaption(e.target.value)}
                            placeholder="Image caption"
                            className="w-full p-2 border rounded-md"
                          />
                        </div>
                      </>
                    )}

                    {/* Insert/Update Button */}
                    <button
                      onClick={insertImageWithOptions}
                      className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
                    >
                      {isEditing ? 'Update Image' : (imageType === 'background' ? 'Insert Background Image' : 'Insert Image')}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowMediaSelector(false);
                    setIsEditing(false);
                    setEditingElement(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      <style jsx>{`
        .tinymce-container {
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 1rem;
        }
        .tinymce-container :global(.tox-tinymce) {
          border: none !important;
        }
        .tinymce-container :global(.tox .tox-toolbar) {
          background-color: #f8f9fa !important;
        }
      `}</style>
    </div>
  );
};

export default TinyMCEWithScripts; 