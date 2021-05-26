package web

import (
	"bytes"
	"encoding/json"
	"encoding/xml"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"gopkg.in/yaml.v2"
)

func (h Helper) toHTTPError(c *gin.Context, e error) {
	if os.IsNotExist(e) {
		h.NegotiateError(c, http.StatusNotFound, e)
		return
	}
	if os.IsPermission(e) {
		h.NegotiateError(c, http.StatusForbidden, e)
		return
	}
	h.NegotiateError(c, http.StatusInternalServerError, e)
}

// NegotiateFilesystem .
func (h Helper) NegotiateFilesystem(c *gin.Context, fs http.FileSystem, path string, index bool) {
	if path == `/` || path == `` {
		path = `/index.html`
	}
	f, e := fs.Open(path)
	if e != nil {
		if !index {
			h.toHTTPError(c, e)
			return
		}
		if path != `/index.html` && os.IsNotExist(e) {
			path = `/index.html`
			f, e = fs.Open(path)
		}
	}
	if e != nil {
		h.toHTTPError(c, e)
		return
	}
	stat, e := f.Stat()
	if e != nil {
		f.Close()
		h.toHTTPError(c, e)
		return
	}
	if stat.IsDir() {
		f.Close()
		h.NegotiateErrorString(c, http.StatusForbidden, `not a file`)
		return
	}

	_, name := filepath.Split(path)
	http.ServeContent(c.Writer, c.Request, name, stat.ModTime(), f)
	f.Close()
}

// NegotiateObject .
func (h Helper) NegotiateObject(c *gin.Context, modtime time.Time, obj interface{}) {
	reader := &objectReader{
		obj: obj,
	}
	switch c.NegotiateFormat(Offered...) {
	case binding.MIMEXML:
		c.Writer.Header().Set(`Content-Type`, `application/xml; charset=utf-8`)
		reader.marshal = xml.Marshal
	case binding.MIMEYAML:
		c.Writer.Header().Set(`Content-Type`, `application/x-yaml; charset=utf-8`)
		reader.marshal = yaml.Marshal
	default:
		// default use json
		reader.marshal = json.Marshal
		c.Writer.Header().Set(`Content-Type`, `application/json; charset=utf-8`)
	}
	http.ServeContent(c.Writer, c.Request, `test`, modtime, reader)
}

type objectReader struct {
	obj     interface{}
	marshal func(v interface{}) ([]byte, error)
	reader  *bytes.Reader
}

func (r *objectReader) getReader() (reader io.ReadSeeker, e error) {
	if r.reader == nil {
		var b []byte
		b, e = r.marshal(r.obj)
		if e != nil {
			return
		}
		r.reader = bytes.NewReader(b)
	}
	reader = r.reader
	return
}
func (r *objectReader) Read(p []byte) (int, error) {
	reader, e := r.getReader()
	if e != nil {
		return 0, e
	}
	return reader.Read(p)
}
func (r *objectReader) Seek(offset int64, whence int) (int64, error) {
	reader, e := r.getReader()
	if e != nil {
		return 0, e
	}
	return reader.Seek(offset, whence)
}
