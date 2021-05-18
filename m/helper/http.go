package helper

import (
	"context"
	"strconv"

	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func (Helper) SetHTTPCacheMaxAge(ctx context.Context, maxAge int) error {
	return grpc.SetHeader(ctx, metadata.Pairs(`Cache-Control`, `max-age=`+strconv.Itoa(maxAge)))
}

func (Helper) SetHTTPCode(ctx context.Context, code int) {
	grpc.SetHeader(ctx, metadata.Pairs(`x-http-code`, strconv.Itoa(code)))
}
