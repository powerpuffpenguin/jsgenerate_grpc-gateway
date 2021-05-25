package helper

import (
	"context"
	"os"
	"strconv"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
)

func (Helper) SetHTTPCacheMaxAge(ctx context.Context, maxAge int) error {
	return grpc.SetHeader(ctx, metadata.Pairs(`Cache-Control`, `max-age=`+strconv.Itoa(maxAge)))
}

func (Helper) SetHTTPCode(ctx context.Context, code int) {
	grpc.SetHeader(ctx, metadata.Pairs(`x-http-code`, strconv.Itoa(code)))
}
func (h Helper) ToHTTPError(ctx context.Context, id string, e error) error {
	if os.IsNotExist(e) {
		return h.Error(codes.NotFound, `not exists : `+id)
	}
	if os.IsExist(e) {
		return h.Error(codes.PermissionDenied, `already exists : `+id)
	}
	if os.IsPermission(e) {
		return h.Error(codes.PermissionDenied, `forbidden : `+id)
	}
	return h.Error(codes.Unknown, e.Error())
}
