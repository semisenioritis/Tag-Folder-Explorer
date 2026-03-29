<script lang="ts">
    import { inconsistencyFlag } from '../store';



</script>


<div class="statusbar">
{#if $inconsistencyFlag}
	<div class="status-text">🔴</div>
{:else}
	<div class="status-text">🟢</div>
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



</style>