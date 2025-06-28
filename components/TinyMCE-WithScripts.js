'use client';

import React, { useState, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { supabase } from '@/lib/supabaseClient';
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
      const { data: files, error } = await supabase.storage
        .from('page-images')
        .list('', {
          limit: 100,
          offset: 0,
        });

      if (error) {
        console.error('Error loading media files:', error);
        return;
      }

      const filesWithUrls = await Promise.all(
        files.map(async (file) => {
          const { data: urlData } = await supabase.storage
            .from('page-images')
            .createSignedUrl(file.name, 3600 * 24 * 365);

          return {
            name: file.name,
            url: urlData?.signedUrl || '',
            size: file.metadata?.size || 0,
            created_at: file.created_at
          };
        })
      );

      setMediaFiles(filesWithUrls);
    } catch (error) {
      console.error('Error loading media files:', error);
    }
  };

  const handleEditorChange = (content) => {
    onChange(content);
  };

  const handleEditorInit = (evt, editor) => {
    editorRef.current = editor;
    
    // Add custom menu for image editing
    editor.ui.registry.addMenuItem('editimage', {
      text: 'Edit Image',
      onAction: () => {
        editExistingImage();
      }
    });

    // Add context menu for images
    editor.on('contextmenu', (e) => {
      const target = e.target;
      if (target.tagName === 'IMG') {
        e.preventDefault();
        editor.selection.select(target);
        
        // Show custom context menu
        const menu = editor.ui.registry.getAll().contextMenus.editimage;
        if (menu) {
          const removeMenu = () => {
            if (menu.menu) {
              menu.menu.remove();
            }
          };
          
          menu.show();
          editor.on('click', removeMenu, true);
        }
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

  return (
    <div className="tinymce-container">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={openMediaSelector}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
          >
            📁 Media Library
          </button>
          <button
            onClick={openHtmlEditor}
            className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
          >
            🔧 Edit HTML
          </button>
        </div>
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
            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
            'fontsize', 'fontsizeselect'
          ],
          toolbar: 'undo redo | blocks | ' +
            'bold italic forecolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'fontsize fontsizeselect | ' +
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