with import <nixpkgs> {};

stdenv.mkDerivation {
    name = "testeditor-java-development";
    buildInputs = [
        nodejs-9_x
        nodePackages.npm
        nodePackages.yarn
    ];
    shellHook = ''
        npm install @angular/cli
        export PATH=`pwd`/node_modules/@angular/cli/bin:$PATH
    '';
}
