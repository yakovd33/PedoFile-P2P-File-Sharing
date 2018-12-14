#include <nan.h>
#include <socket>
#include <iostream>

using namespace std;

// NAN_METHOD is a Nan macro enabling convenient way of creating native node functions.
// It takes a method's name as a param. By C++ convention, I used the Capital cased name.
NAN_METHOD(Listen) {
    // Create an instance of V8's String type
    auto message = Nan::New("Listen from C++dddd!").ToLocalChecked();
    // 'info' is a macro's "implicit" parameter - it's a bridge object between C++ and JavaScript runtimes
    // You would use info to both extract the parameters passed to a function as well as set the return value.
    info.GetReturnValue().Set(message);
}

// Module initialization logic
NAN_MODULE_INIT(Initialize) {
    // Export the `Listen` function (equivalent to `export function Listen (...)` in JS)
    NAN_EXPORT(target, Listen);
}

// Create the module called "addon" and initialize it with `Initialize` function (created with NAN_MODULE_INIT macro)
NODE_MODULE(addon, Initialize);

void DownloadFile(SOCKET Socket){
	if(Socket == NULL){
		return;
	}
	while(1){
		printf("Input local filename: ");
		char localfile[1024];
		gets_s(localfile, 1024);
		if(localfile[0] == '.'){
			send(Socket, localfile, sizeof(localfile), 0);
			break;
		}
		printf("Input remote filename: ");
		char filename[1024];
		gets_s(filename, 1024);
		if(filename[0] == '.'){
			send(Socket, filename, sizeof(filename), 0);
			break;
		}
		send(Socket, filename, sizeof(filename), 0);
		char GotFileSize[1024];
		recv(Socket, GotFileSize, 1024, 0);
		long FileSize = atoi(GotFileSize);
		long SizeCheck = 0;
		FILE *fp = fopen(localfile, "w");
		char* mfcc;
		if(FileSize > 1499){
			mfcc = (char*)malloc(1500);
			while(SizeCheck < FileSize){
				int Received = recv(Socket, mfcc, 1500, 0);
				SizeCheck += Received;
				fwrite(mfcc, 1, Received, fp);
				fflush(fp);
				printf("Filesize: %d\nSizecheck: %d\nReceived: %d\n\n", FileSize, SizeCheck, Received);
			}
		}
		else{
			mfcc = (char*)malloc(FileSize + 1);
			int Received = recv(Socket, mfcc, FileSize, 0);
			fwrite(mfcc, 1, Received, fp);
			fflush(fp);
		}
		fclose(fp);
		Sleep(500);
		free(mfcc);
	}
}

void SendFile(SOCKET Socket){
	if(Socket == NULL){
		return;
	}
	while(1){
		char filename[1024];
		recv(Socket, filename, sizeof(filename), 0);
		if(filename[0] == '.'){
			break;
		}
		FILE* fp = fopen(filename, "r");
		fseek(fp, 0, SEEK_END);
		long FileSize = ftell(fp);
		char GotFileSize[1024];
		_itoa_s(FileSize, GotFileSize, 10);
		send(Socket, GotFileSize, 1024, 0);
		rewind(fp);
		long SizeCheck = 0;
		char* mfcc;
		if(FileSize > 1499){
			mfcc = (char*)malloc(1500);
			while(SizeCheck < FileSize){
				int Read = fread_s(mfcc, 1500, sizeof(char), 1500, fp);
				int Sent = send(Socket, mfcc, Read, 0);
				SizeCheck += Sent;
			}
		}
		else{
			mfcc = (char*)malloc(FileSize + 1);
			fread_s(mfcc, FileSize, sizeof(char), FileSize, fp);
			send(Socket, mfcc, FileSize, 0);
		}
		fclose(fp);
		Sleep(500);
		free(mfcc);
	}
	return;
}