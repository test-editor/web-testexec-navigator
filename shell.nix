with import <nixpkgs> {};

stdenv.mkDerivation {
    name = "testeditor-angular-development";
    buildInputs = [
        nodejs-9_x
        nodePackages.npm
        nodePackages.yarn
        nodePackages.jsonlint
        bashInteractive
    ];
    shellHook = ''
        # make sure no output is done, since direnv fails with direnv: error unmarshal() base64 decoding: illegal base64 data at input byte ?
        npm install @angular/cli > /dev/null 2>&1
        export PATH=`pwd`/node_modules/@angular/cli/bin:$PATH
    '';
}
