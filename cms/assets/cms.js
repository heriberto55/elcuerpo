(function () {
  const frame = document.getElementById('pagePreview');
  const app = document.querySelector('.cms-app');
  const toggleSidebarButton = document.getElementById('toggleSidebar');
  const closeSidebarButton = document.getElementById('closeSidebar');
  const editButton = document.getElementById('editPage');
  const saveButton = document.getElementById('savePage');
  const cancelButton = document.getElementById('cancelEdit');
  const status = document.getElementById('saveStatus');
  const mediaTools = document.getElementById('mediaTools');
  const insertMenu = document.getElementById('insertMenu');
  const selectedMenu = document.getElementById('selectedMenu');
  const insertImageButton = document.getElementById('insertImage');
  const insertVideoButton = document.getElementById('insertVideo');
  const insertYoutubeButton = document.getElementById('insertYoutube');
  const replaceMediaButton = document.getElementById('replaceMedia');
  const replaceIframeButton = document.getElementById('replaceIframe');
  const changeYoutubeButton = document.getElementById('changeYoutube');
  const moveMediaUpButton = document.getElementById('moveMediaUp');
  const moveMediaDownButton = document.getElementById('moveMediaDown');
  const deleteMediaButton = document.getElementById('deleteMedia');
  const selectedMediaLabel = document.getElementById('selectedMediaLabel');
  const imageUpload = document.getElementById('imageUpload');
  const videoUpload = document.getElementById('videoUpload');
  const replaceUpload = document.getElementById('replaceUpload');
  const config = window.CMS_CONFIG || {};
  const previewBaseUrl = frame.getAttribute('src').split('?')[0];
  let originalHtml = '';
  let editing = false;
  let selectedMedia = null;
  let savedRange = null;

  function getFrameDocument() {
    return frame.contentDocument || frame.contentWindow.document;
  }

  function setStatus(message, isError) {
    status.textContent = message || '';
    status.style.color = isError ? '#a33232' : '';
  }

  function isMediaElement(element) {
    return element && ['IMG', 'VIDEO', 'IFRAME'].indexOf(element.tagName) !== -1;
  }

  function isYoutubeElement(element) {
    const src = element && element.getAttribute ? element.getAttribute('src') || element.getAttribute('data-src') || '' : '';
    return /youtube\.com|youtu\.be/.test(src);
  }

  function youtubeEmbedUrl(url) {
    const value = (url || '').trim();
    const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/);
    return match ? 'https://www.youtube.com/embed/' + match[1] : '';
  }

  function iframeUrl(url) {
    const value = (url || '').trim();
    if (!/^https?:\/\//i.test(value)) {
      return '';
    }

    return value;
  }

  function mediaName(element) {
    if (!element) {
      return 'Selecciona una imagen o video';
    }
    if (element.tagName === 'IMG') {
      return 'Imagen seleccionada';
    }
    if (element.tagName === 'VIDEO') {
      return 'Video seleccionado';
    }
    return isYoutubeElement(element) ? 'Video YouTube seleccionado' : 'Iframe seleccionado';
  }

  function updateMediaButtons() {
    const hasSelection = Boolean(selectedMedia && selectedMedia.isConnected);
    selectedMediaLabel.textContent = hasSelection ? mediaName(selectedMedia) : 'Selecciona una imagen o video';
    replaceMediaButton.disabled = !hasSelection || selectedMedia.tagName === 'IFRAME';
    replaceIframeButton.disabled = !hasSelection || selectedMedia.tagName !== 'IFRAME';
    changeYoutubeButton.disabled = !hasSelection || !isYoutubeElement(selectedMedia);
    moveMediaUpButton.disabled = !hasSelection;
    moveMediaDownButton.disabled = !hasSelection;
    deleteMediaButton.disabled = !hasSelection;
  }

  function mediaAtPoint(doc, x, y) {
    const mediaElements = Array.from(doc.querySelectorAll('img,video,iframe'));
    for (let i = mediaElements.length - 1; i >= 0; i -= 1) {
      const rect = mediaElements[i].getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return mediaElements[i];
      }
    }

    return null;
  }

  function setInsertPointFromEvent(doc, event) {
    let range = null;
    if (doc.caretRangeFromPoint) {
      range = doc.caretRangeFromPoint(event.clientX, event.clientY);
    } else if (doc.caretPositionFromPoint) {
      const position = doc.caretPositionFromPoint(event.clientX, event.clientY);
      if (position) {
        range = doc.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
      }
    }

    savedRange = range;
  }

  function hideContextMenu() {
    mediaTools.hidden = true;
  }

  function setSidebar(open) {
    app.classList.toggle('sidebar-collapsed', !open);
    toggleSidebarButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggleSidebarButton.setAttribute('aria-label', open ? 'Cerrar menu de paginas' : 'Abrir menu de paginas');
  }

  function reloadPreview() {
    editing = false;
    selectedMedia = null;
    savedRange = null;
    hideContextMenu();
    editButton.disabled = true;
    saveButton.disabled = true;
    cancelButton.disabled = true;
    frame.src = previewBaseUrl + '?cms_preview=' + Date.now();
  }

  function showContextMenu(clientX, clientY, mode) {
    insertMenu.hidden = mode !== 'insert';
    selectedMenu.hidden = mode !== 'selected';
    mediaTools.hidden = false;

    const margin = 12;
    const rect = mediaTools.getBoundingClientRect();
    const left = Math.min(clientX, window.innerWidth - rect.width - margin);
    const top = Math.min(clientY, window.innerHeight - rect.height - margin);

    mediaTools.style.left = Math.max(margin, left) + 'px';
    mediaTools.style.top = Math.max(margin, top) + 'px';
  }

  function saveCurrentRange(doc) {
    const selection = doc.getSelection();
    if (selection && selection.rangeCount) {
      savedRange = selection.getRangeAt(0).cloneRange();
    }
  }

  function selectMedia(element) {
    const doc = getFrameDocument();
    doc.querySelectorAll('.cms-selected-media').forEach(function (node) {
      node.classList.remove('cms-selected-media');
    });

    selectedMedia = isMediaElement(element) ? element : null;
    if (selectedMedia) {
      selectedMedia.classList.add('cms-selected-media');
    }
    updateMediaButtons();
  }

  function addEditorStyles(doc) {
    if (doc.getElementById('cms-editor-styles')) {
      return;
    }

    const style = doc.createElement('style');
    style.id = 'cms-editor-styles';
    style.textContent = [
      '.cms-editing img,.cms-editing video,.cms-editing iframe{cursor:pointer;outline:2px dashed rgba(31,122,77,.35);outline-offset:3px;pointer-events:none;}',
      '.cms-editing .cms-selected-media{outline:4px solid #1f7a4d!important;outline-offset:4px;}'
    ].join('');
    doc.head.appendChild(style);
  }

  function removeEditorMarkers(doc) {
    const style = doc.getElementById('cms-editor-styles');
    if (style) {
      style.remove();
    }

    doc.querySelectorAll('.cms-selected-media').forEach(function (node) {
      node.classList.remove('cms-selected-media');
    });
    doc.body.classList.remove('cms-editing');
  }

  function wireMediaSelection(doc) {
    addEditorStyles(doc);
    if (!doc.cmsMediaWired) {
      doc.addEventListener('click', function (event) {
        if (!editing) {
          return;
        }

        hideContextMenu();
        const media = mediaAtPoint(doc, event.clientX, event.clientY);
        if (isMediaElement(media)) {
          event.preventDefault();
          event.stopPropagation();
          selectMedia(media);
          return;
        }

        selectMedia(null);
      }, true);

      doc.addEventListener('contextmenu', function (event) {
        if (!editing) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const frameRect = frame.getBoundingClientRect();
        const media = mediaAtPoint(doc, event.clientX, event.clientY);
        if (isMediaElement(media)) {
          selectMedia(media);
          savedRange = null;
          showContextMenu(frameRect.left + event.clientX, frameRect.top + event.clientY, 'selected');
          return;
        }

        selectMedia(null);
        setInsertPointFromEvent(doc, event);
        showContextMenu(frameRect.left + event.clientX, frameRect.top + event.clientY, 'insert');
      }, true);

      doc.addEventListener('paste', function (event) {
        if (!editing || !event.clipboardData) {
          return;
        }

        const files = Array.from(event.clipboardData.items || [])
          .filter(function (item) {
            return item.kind === 'file' && /^(image|video)\//.test(item.type);
          })
          .map(function (item) {
            return item.getAsFile();
          })
          .filter(Boolean);

        if (!files.length) {
          return;
        }

        event.preventDefault();
        files.reduce(function (chain, file) {
          return chain.then(function () {
            return uploadMedia(file).then(function (data) {
              if (data.type === 'image') {
                insertHtml('<img src="' + data.url + '" alt="">');
              } else {
                insertHtml('<video src="' + data.url + '" controls></video>');
              }
            });
          });
        }, Promise.resolve()).then(function () {
          setStatus('Archivo pegado.');
        }).catch(function (error) {
          setStatus(error.message, true);
        });
      });

      doc.cmsMediaWired = true;
    }
  }

  function uploadMedia(file) {
    const payload = new FormData();
    payload.append('media', file);
    payload.append('csrf_token', config.csrfToken);
    setStatus('Subiendo archivo...');

    return fetch('upload_media.php', {
      method: 'POST',
      body: payload,
      credentials: 'same-origin'
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) {
          throw new Error(data.message || 'No se pudo subir el archivo.');
        }
        return data;
      });
    });
  }

  function insertHtml(html) {
    const doc = getFrameDocument();
    frame.contentWindow.focus();

    if (selectedMedia && selectedMedia.isConnected) {
      selectedMedia.insertAdjacentHTML('afterend', html);
      selectMedia(selectedMedia.nextElementSibling);
      return;
    }

    const selection = doc.getSelection();
    if (savedRange && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }
    doc.execCommand('insertHTML', false, html);
    savedRange = null;
    wireMediaSelection(doc);
  }

  function setEditing(nextEditing) {
    const doc = getFrameDocument();
    editing = nextEditing;
    doc.designMode = editing ? 'on' : 'off';
    doc.body.classList.toggle('cms-editing', editing);
    hideContextMenu();
    editButton.disabled = editing;
    saveButton.disabled = !editing;
    cancelButton.disabled = !editing;

    if (editing) {
      wireMediaSelection(doc);
    } else {
      savedRange = null;
      selectMedia(null);
    }

    setStatus(editing ? 'Modo edición activo' : '');
  }

  frame.addEventListener('load', function () {
    const doc = getFrameDocument();
    doc.designMode = 'off';
    originalHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    editing = false;
    selectedMedia = null;
    editButton.disabled = false;
    saveButton.disabled = true;
    cancelButton.disabled = true;
    mediaTools.hidden = true;
    updateMediaButtons();
    setStatus('');
  });

  editButton.addEventListener('click', function () {
    try {
      setEditing(true);
      frame.contentWindow.focus();
    } catch (error) {
      setStatus('No se pudo activar la edición.', true);
    }
  });

  toggleSidebarButton.addEventListener('click', function () {
    setSidebar(app.classList.contains('sidebar-collapsed'));
  });

  closeSidebarButton.addEventListener('click', function () {
    setSidebar(false);
  });

  cancelButton.addEventListener('click', function () {
    if (!editing) {
      return;
    }

    reloadPreview();
  });

  insertImageButton.addEventListener('click', function () {
    hideContextMenu();
    imageUpload.click();
  });

  insertVideoButton.addEventListener('click', function () {
    hideContextMenu();
    videoUpload.click();
  });

  insertYoutubeButton.addEventListener('click', function () {
    hideContextMenu();
    const url = prompt('Pega el link de YouTube');
    const embedUrl = youtubeEmbedUrl(url);
    if (!embedUrl) {
      setStatus('El link de YouTube no es valido.', true);
      return;
    }

    insertHtml('<iframe src="' + embedUrl + '" frameborder="0" allowfullscreen></iframe>');
    setStatus('Video de YouTube agregado.');
  });

  imageUpload.addEventListener('change', function () {
    const file = imageUpload.files[0];
    imageUpload.value = '';
    if (!file) {
      return;
    }

    uploadMedia(file).then(function (data) {
      insertHtml('<img src="' + data.url + '" alt="">');
      setStatus('Imagen agregada.');
    }).catch(function (error) {
      setStatus(error.message, true);
    });
  });

  videoUpload.addEventListener('change', function () {
    const file = videoUpload.files[0];
    videoUpload.value = '';
    if (!file) {
      return;
    }

    uploadMedia(file).then(function (data) {
      insertHtml('<video src="' + data.url + '" controls></video>');
      setStatus('Video agregado.');
    }).catch(function (error) {
      setStatus(error.message, true);
    });
  });

  replaceMediaButton.addEventListener('click', function () {
    if (!selectedMedia) {
      return;
    }

    hideContextMenu();
    replaceUpload.accept = selectedMedia.tagName === 'IMG' ? 'image/*' : 'video/*';
    replaceUpload.click();
  });

  replaceIframeButton.addEventListener('click', function () {
    if (!selectedMedia || selectedMedia.tagName !== 'IFRAME') {
      return;
    }

    hideContextMenu();
    const url = prompt('Pega el nuevo link del iframe', selectedMedia.getAttribute('src') || selectedMedia.getAttribute('data-src') || '');
    const nextUrl = youtubeEmbedUrl(url) || iframeUrl(url);
    if (!nextUrl) {
      setStatus('El link del iframe no es valido.', true);
      return;
    }

    selectedMedia.setAttribute('src', nextUrl);
    if (selectedMedia.hasAttribute('data-src')) {
      selectedMedia.setAttribute('data-src', nextUrl);
    }
    setStatus('Iframe reemplazado.');
  });

  replaceUpload.addEventListener('change', function () {
    const file = replaceUpload.files[0];
    replaceUpload.value = '';
    if (!file || !selectedMedia) {
      return;
    }

    uploadMedia(file).then(function (data) {
      if (selectedMedia.tagName === 'IMG' && data.type === 'image') {
        selectedMedia.setAttribute('src', data.url);
      } else if (selectedMedia.tagName === 'VIDEO' && data.type === 'video') {
        selectedMedia.setAttribute('src', data.url);
        selectedMedia.setAttribute('controls', 'controls');
      } else {
        throw new Error('El tipo de archivo no coincide con el elemento seleccionado.');
      }
      setStatus('Archivo reemplazado.');
    }).catch(function (error) {
      setStatus(error.message, true);
    });
  });

  changeYoutubeButton.addEventListener('click', function () {
    if (!selectedMedia || !isYoutubeElement(selectedMedia)) {
      return;
    }

    hideContextMenu();
    const url = prompt('Pega el nuevo link de YouTube');
    const embedUrl = youtubeEmbedUrl(url);
    if (!embedUrl) {
      setStatus('El link de YouTube no es valido.', true);
      return;
    }

    selectedMedia.setAttribute('src', embedUrl);
    if (selectedMedia.hasAttribute('data-src')) {
      selectedMedia.setAttribute('data-src', embedUrl);
    }
    setStatus('Link de YouTube actualizado.');
  });

  moveMediaUpButton.addEventListener('click', function () {
    if (!selectedMedia || !selectedMedia.previousElementSibling) {
      return;
    }

    hideContextMenu();
    selectedMedia.parentNode.insertBefore(selectedMedia, selectedMedia.previousElementSibling);
    setStatus('Elemento movido.');
  });

  moveMediaDownButton.addEventListener('click', function () {
    if (!selectedMedia || !selectedMedia.nextElementSibling) {
      return;
    }

    hideContextMenu();
    selectedMedia.parentNode.insertBefore(selectedMedia.nextElementSibling, selectedMedia);
    setStatus('Elemento movido.');
  });

  deleteMediaButton.addEventListener('click', function () {
    if (!selectedMedia) {
      return;
    }

    hideContextMenu();
    selectedMedia.remove();
    selectMedia(null);
    setStatus('Elemento eliminado.');
  });

  document.addEventListener('click', function (event) {
    if (event.button === 0) {
      hideContextMenu();
    }

    if (!mediaTools.hidden && !mediaTools.contains(event.target)) {
      hideContextMenu();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      hideContextMenu();
    }
  });

  saveButton.addEventListener('click', function () {
    if (!editing) {
      return;
    }

    const doc = getFrameDocument();
    hideContextMenu();
    removeEditorMarkers(doc);
    doc.designMode = 'off';
    const html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    doc.designMode = 'on';
    addEditorStyles(doc);
    doc.body.classList.add('cms-editing');

    const payload = new FormData();
    payload.append('page', config.page);
    payload.append('html', html);
    payload.append('csrf_token', config.csrfToken);

    saveButton.disabled = true;
    setStatus('Guardando...');

    fetch('save_page.php', {
      method: 'POST',
      body: payload,
      credentials: 'same-origin'
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || !data.ok) {
            throw new Error(data.message || 'No se pudo guardar.');
          }
          return data;
        });
      })
      .then(function (data) {
        originalHtml = html;
        setEditing(false);
        setStatus(data.message || 'Cambios guardados.');
      })
      .catch(function (error) {
        saveButton.disabled = false;
        setStatus(error.message, true);
      });
  });
})();
