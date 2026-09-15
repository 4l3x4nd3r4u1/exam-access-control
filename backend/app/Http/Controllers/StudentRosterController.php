<?php

namespace App\Http\Controllers;

use App\DTOs\RawFileData;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentRosterController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    /**
     * Endpoint to upload and import student roster.
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file',
        ]);

        $uploadedFile = $request->file('file');
        $content = file_get_contents($uploadedFile->getRealPath());
        $fileName = $uploadedFile->getClientOriginalName();
        $extension = $uploadedFile->getClientOriginalExtension();

        $fileData = new RawFileData(
            content: $content,
            fileName: $fileName,
            extension: $extension
        );

        $summary = $this->storage->importStudentRoster($fileData);

        return response()->json([
            'success' => $summary->isSuccessful,
            'data' => [
                'totalProcessed' => $summary->totalProcessed,
                'successful' => $summary->successful,
                'skipped' => $summary->skipped,
                'observations' => $summary->observations,
                'isSuccessful' => $summary->isSuccessful,
            ],
            'message' => $summary->isSuccessful
                ? 'Student roster processed successfully.'
                : 'Failed to process student roster.',
        ], $summary->isSuccessful ? 200 : 422);
    }
}
