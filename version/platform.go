package version

import (
	"fmt"
	"runtime"
)

var Platform = fmt.Sprintf(`%v %v %v`,
	runtime.GOOS, runtime.GOARCH, runtime.Version(),
)
