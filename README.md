[中文 Chinese](https://blog.king011.com/?p=184)

# jsgenerate_grpc-gateway
grpc or grpc-gateway project template

use [jsgenerate](https://github.com/powerpuffpenguin/jsgenerate) to create a project

features:

* support grpc and http at the same time(grpc-gateway acts as a reverse proxy)
* grpc and http share the same port
* grpc-gateway communicates with grpc directly use memory without socket

# install template

1. first install nodejs and npm 
2. install jsgenerate using npm `npm install -g @king011/jsgenerate`
3. clone template to **~/.jsgenerate/init** `git clone https://github.com/powerpuffpenguin/jsgenerate_grpc-gateway.git ~/.jsgenerate/init/jsgenerate_grpc-gateway`

# create new project

create a project, package named powerpuffpenguin/example.
```
mkdir srv && cd srv && \
     jsgenerate init jsgenerate_grpc-gateway -t init-supplement -p powerpuffpenguin/example
```

create a project, generate default front-end code.
```
mkdir srv && cd srv && \
     jsgenerate init jsgenerate_grpc-gateway -t init-supplement  -t view -p powerpuffpenguin/example
```


other options
```
$ jsgenerate init jsgenerate_grpc-gateway -h
Usage: jsgenerate init jsgenerate_grpc-gateway [options]

google grpc frame template

Options:
  -n, --name []        project name
  -p, --package []     package name
  -t, --tag [tags...]  code generate tag
  --list-tag           list supported tag
  -h, --help           display help for command
```

all tags
```
$ jsgenerate init jsgenerate_grpc-gateway --list-tag
default view init-trunc init-supplement
```

# proto uuid path

[https://github.com/golang/protobuf/issues/1122](https://github.com/golang/protobuf/issues/1122)

# project structure list

* bin -> compile output, log, configure
* cmd -> command line analysis, program entry
* main.go -> cmd.Execute()
* configure -> configuration definition
* db -> data layer
* docker -> if you want to publish docker images, please define here
* logger -> logging
* m -> module related, please implement grpc module here
* pb -> grpc definition(*.proto)
* protocol -> code generated by grpc
* script -> project automation script
* build.sh -> project automation script entry
* sessions -> session system
* signal -> slot signal for module communication
* static -> embedded resources that need to be packaged
* assets -> embedded resource code
* third_party -> googleapis *.proto
* utils -> project tool functions
* version -> version definition
* view -> an angular implementation of the default frontend

# build.sh script

build.sh and script provide some automated scripts

You can usually compile the project according to the following steps
```
# 1. generate grpc code
./build.sh grpc

# 2. generate resource embed code
./build.sh document

# 3. If the default front end is included, compile and generate the embed code
./build.sh view # build
./build.sh view -s # -s embed

# 4. compile go code
./build.sh go
```

## script/conf.sh

automation script configuration

```
Target="example"
Docker="powerpuffpenguin/example"
Dir=$(cd "$(dirname $BASH_SOURCE)/.." && pwd)
Version="v0.0.1"
View=1
Platforms=(
    darwin/amd64
    windows/amd64
    linux/arm
    linux/amd64
)
UUID="b1300070-c028-11eb-b0aa-27a5fad41b4d"
Protos=(
    system/system.proto
    session/session.proto
    user/user.proto
    logger/logger.proto
)
```

* Target -> compile output file name
* Docker -> docker images name
* Dir -> project root path, please do not modify
* Version -> the current version number, automatically overwrite the definition in the source code when compiling
* Platforms -> The target platform of the `./build.sh pack`  instruction package
* UUID -> proto uuid, please do not modify
* Protos -> participate in the generated proto file

## -h
you can use -h to view help for all commands including subcommands 

```
$ ./build.sh -h
build script

Usage:
  ./build.sh [flags]
  ./build.sh [command]

Available Commands:
  help              help for ./build.sh
  clear             clear output
  document          static build document
  go                go build helper
  view              view build helper
  grpc              grpc protoc helper
  pack              pack release
  run               run project
  docker            docker build helper

Flags:
  -h, --help          help for ./build.sh
```

```
$ ./build.sh go -h
go build helper

Usage:
  ./build.sh go [flags]

Flags:
  -c, --clear         clear output
  -d, --debug         build debug mode
  -l, --list          list all supported platforms
  -p, --pack          pack to compressed package [7z gz bz2 xz zip]
  -P, --platform      build platform (default "linux/amd64")
  -u, --upx           use upx to compress executable programs
  -h, --help          help for ./build.sh go
```

# Add grpc module

The template provides several default modules, in addition, you can add additional modules by following the steps below

1. define the module in the pb folder

2. modify the script/conf.sh file to add a new proto file

3. implement the grpc module under the m/server folder and implement the m.register.Module interface

    ```
    type Module interface {
        RegisterGRPC(srv *grpc.Server)
        RegisterGateway(gateway *runtime.ServeMux, cc *grpc.ClientConn) error
    }
    ```
4. add modules in m/register/grpc.go

    ```
    func GRPC(srv *grpc.Server, gateway *runtime.ServeMux, cc *grpc.ClientConn) {
        ms := []Module{
            m_system.Module(0),
            m_session.Module(0),
            m_user.Module(0),
            m_logger.Module(0),
        }
        for _, m := range ms {
            m.RegisterGRPC(srv)
            if gateway != nil {
                e := m.RegisterGateway(gateway, cc)
                if e != nil {
                    logger.Logger.Panic(`register gateway error`,
                        zap.Error(e),
                    )
                }
            }
        }
    }
    ```