<script lang="ts">
    import { inconsistencyFlag } from '../store';



</script>


<div class="statusbar">
{#if $inconsistencyFlag}
	<div class="status-icon-holder">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e84545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-x-icon lucide-book-x"><path d="m14.5 7-5 5"/><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/><path d="m9.5 7 5 5"/></svg>
    </div>
{:else}
    <div class="status-icon-holder">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3cb44a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-check-icon lucide-book-check"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/><path d="m9 9.5 2 2 4-4"/></svg>
    </div>
{/if}


</div>


<style>
.statusbar{
    height: 30px;
    background-color: var(--background-primary-alt);
    display: flex;
    justify-content: flex-end;  /* right */
    align-items: center;        /* vertical center */
}

.status-icon-holder{
    padding: 2px;
}


</style>